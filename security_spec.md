# Security Spec

1. Data Invariants:
- A user can only create an account if signed in.
- turmas, alunos, frequencias can be read and written by any authenticated user.
- System requires basic structure validation.

2. Dirty Dozen Payloads:
- [P1] Create user with no name
- [P2] Update user role as non-admin
- [P3] Create turma with invalid name type
- [P4] Create aluno with invalid nivel
- [P5] Inject huge string into frequencia status
... (omitted for brevity)
