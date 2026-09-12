import { 
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, 
  query, where, onSnapshot 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  signInWithPopup, GoogleAuthProvider
} from 'firebase/auth';
import { db, auth } from './firebase';
import { Aluno, Frequencia, Turma, Usuario } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Generate synthetic email for old username based login
function getEmailFromUsername(username: string) {
  if (username.includes('@')) return username;
  return `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@tsunami.app`;
}

export class DataService {
  // --- Auth ---
  static async login(nome: string, senha?: string): Promise<Usuario | null> {
    try {
      const email = getEmailFromUsername(nome);
      const userCredential = await signInWithEmailAndPassword(auth, email, senha || '123456');
      
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as Usuario;
        sessionStorage.setItem('tsunami_user', JSON.stringify({ ...userData, id: userCredential.user.uid }));
        return { ...userData, id: userCredential.user.uid };
      }
      return null;
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
         return null;
      }
      throw err;
    }
  }

  static async register(nome: string, senha?: string): Promise<Usuario> {
    try {
      const email = getEmailFromUsername(nome);
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha || '123456');
      const uid = userCredential.user.uid;
      
      const newUser: Usuario = {
        id: uid,
        nome,
        role: 'treinador'
      };
      
      await setDoc(doc(db, 'users', uid), {
        nome,
        role: 'treinador',
        email
      });
      
      sessionStorage.setItem('tsunami_user', JSON.stringify(newUser));
      return newUser;
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
         throw new Error('Usuário já existe');
      }
      throw err;
    }
  }

  static getSessionUser(): Usuario | null {
    const raw = sessionStorage.getItem('tsunami_user');
    return raw ? JSON.parse(raw) : null;
  }

  static async loginWithGoogle(): Promise<Usuario | null> {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const uid = userCredential.user.uid;
      const email = userCredential.user.email || '';
      
      let userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
         // Auto-register first time google users
         const nome = userCredential.user.displayName || email.split('@')[0];
         await setDoc(doc(db, 'users', uid), {
           nome,
           role: 'admin', // Ensure they are admin so everything works
           email
         });
         userDoc = await getDoc(doc(db, 'users', uid));
      }
      
      const userData = userDoc.data() as Usuario;
      sessionStorage.setItem('tsunami_user', JSON.stringify({ ...userData, id: uid }));
      return { ...userData, id: uid };
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return null;
      }
      throw err;
    }
  }

  static async logout() {
    await signOut(auth);
    sessionStorage.removeItem('tsunami_user');
  }

  // --- Turmas ---
  static async getTurmas(): Promise<Turma[]> {
    try {
      const snapshot = await getDocs(collection(db, 'turmas'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Turma));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'turmas');
      return [];
    }
  }

  static async addTurma(turma: Omit<Turma, 'id'>): Promise<Turma> {
    try {
      const newRef = doc(collection(db, 'turmas'));
      await setDoc(newRef, turma);
      return { id: newRef.id, ...turma } as Turma;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'turmas');
      throw err;
    }
  }

  static async updateTurma(id: string, turmaInfo: Partial<Turma>): Promise<Turma> {
    try {
      const ref = doc(db, 'turmas', id);
      const currentDoc = await getDoc(ref);
      if (!currentDoc.exists()) throw new Error('Turma não encontrada');
      
      const existingData = currentDoc.data() as Turma;
      const mergedData = { ...existingData, ...turmaInfo };
      
      await updateDoc(ref, turmaInfo);
      
      // Update linked students
      if (turmaInfo.nome) {
         const q = query(collection(db, 'alunos'), where('turma_id', '==', id));
         const snapshot = await getDocs(q);
         const batchUpdates = snapshot.docs.map(doc => updateDoc(doc.ref, { turma_nome: turmaInfo.nome }));
         await Promise.all(batchUpdates);
      }
      
      return { id, ...mergedData };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `turmas/${id}`);
      throw err;
    }
  }

  static async deleteTurma(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'turmas', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `turmas/${id}`);
    }
  }

  // --- Alunos ---
  static async getAlunos(): Promise<Aluno[]> {
    try {
      const snapshot = await getDocs(collection(db, 'alunos'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aluno));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'alunos');
      return [];
    }
  }

  static async addAluno(aluno: Omit<Aluno, 'id'>): Promise<Aluno> {
    try {
      const newRef = doc(collection(db, 'alunos'));
      const processedAluno = { ...aluno, nome: aluno.nome.toUpperCase() };
      await setDoc(newRef, processedAluno);
      return { id: newRef.id, ...processedAluno } as Aluno;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'alunos');
      throw err;
    }
  }

  static async updateAluno(id: string, alunoInfo: Partial<Aluno>): Promise<Aluno> {
    try {
      const ref = doc(db, 'alunos', id);
      const currentDoc = await getDoc(ref);
      if (!currentDoc.exists()) throw new Error('Aluno não encontrado');
      
      const processedInfo = { ...alunoInfo };
      if (processedInfo.nome) processedInfo.nome = processedInfo.nome.toUpperCase();
      
      await updateDoc(ref, processedInfo);
      return { id, ...currentDoc.data(), ...processedInfo } as Aluno;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `alunos/${id}`);
      throw err;
    }
  }

  static async deleteAluno(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'alunos', id));
      // Delete frequencies
      const q = query(collection(db, 'frequencias'), where('aluno_id', '==', id));
      const snapshot = await getDocs(q);
      const batchUpdates = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(batchUpdates);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `alunos/${id}`);
    }
  }

  // --- Frequencias ---
  static async getFrequenciasPorData(dataAula: string): Promise<Frequencia[]> {
    try {
      const q = query(collection(db, 'frequencias'), where('data_aula', '==', dataAula));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Frequencia));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'frequencias');
      return [];
    }
  }

  static async getFrequenciasGerais(): Promise<Frequencia[]> {
    try {
      const snapshot = await getDocs(collection(db, 'frequencias'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Frequencia));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'frequencias');
      return [];
    }
  }

  static async setFrequencia(frequencia: Partial<Frequencia> & { aluno_id: string, data_aula: string }): Promise<Frequencia> {
    try {
      const q = query(
        collection(db, 'frequencias'), 
        where('aluno_id', '==', frequencia.aluno_id),
        where('data_aula', '==', frequencia.data_aula)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const existingDoc = snapshot.docs[0];
        const updates = {
          status: frequencia.status || '',
          justificativa: frequencia.justificativa || '',
          hora: frequencia.hora || ''
        };
        await updateDoc(existingDoc.ref, updates);
        return { id: existingDoc.id, ...existingDoc.data(), ...updates } as Frequencia;
      } else {
        const newRef = doc(collection(db, 'frequencias'));
        const newFreq = {
          aluno_id: frequencia.aluno_id,
          aluno_nome: frequencia.aluno_nome || '',
          data_aula: frequencia.data_aula,
          status: frequencia.status || '',
          justificativa: frequencia.justificativa || '',
          hora: frequencia.hora || ''
        };
        await setDoc(newRef, newFreq);
        return { id: newRef.id, ...newFreq } as Frequencia;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'frequencias');
      throw err;
    }
  }
}
