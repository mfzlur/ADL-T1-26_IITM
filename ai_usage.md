# AI Usage Declaration

This document quantifies the extent of AI assistance utilized during the development of the **Chess Masterclass & Coaching Arena** project, in accordance with the App Dev Lab guidelines.

## AI Usage Quantification Table

| Component / Module | Weight (%) | AI Involvement (%) | AI Contribution (%) | Details / Example of AI Use |
| :--- | :---: | :---: | :---: | :--- |
| **Frontend (40%)** | | | **18.0%** | |
| Components (/components) | 10% | 50% | 5.0% | UI layouts, JSX scaffolding, and Tailwind styling. |
| Pages (/pages) | 15% | 33% | 5.0% | Scaffolding page structures and layout flows. |
| Services (/services) | 5% | 80% | 4.0% | Writing repetitive Axios/fetch call boilerplate. |
| Context / Hooks | 5% | 20% | 1.0% | Scaffolding custom hook structures. |
| Main setup (App.jsx) | 5% | 20% | 1.0% | Initial routing and component tree setup. |
| **Backend (50%)** | | | **4.0%** | |
| Entities (/entities) | 10% | 20% | 2.0% | TypeORM decorator scaffolding and entity definitions. |
| Controllers | 15% | 0% | 0.0% | **Manual Implementation**: Core CRUD and business logic. |
| Services | 10% | 0% | 0.0% | **Manual Implementation**: Transactions and promotion logic. |
| Routes | 5% | 20% | 1.0% | Structuring route files and mounting handlers. |
| Middlewares | 5% | 20% | 1.0% | Scaffolding JWT and validation middleware structures. |
| Utils | 5% | 0% | 0.0% | **Manual Implementation**: Helper functions. |
| **Infrastructure (10%)** | | | **4.0%** | |
| Database Config | 6% | 0% | 0.0% | **Manual Implementation**: PostgreSQL/TypeORM setup. |
| Redis Config | 4% | 100% | 4.0% | Configuration of ioredis and CacheService wrapper. |
| **TOTAL AI USAGE** | **100%** | | **24.0%** | |

## Declaration Note

### Statement of AI Assistance
AI assistance for this project was strictly limited to generating well-defined, prompted codeblocks and repetitive boilerplate patterns, primarily within the frontend layer. 

- **Components Assisted**: Frontend UI components (Navbar, Tables, Cards), API service boilerplate, and TypeORM entity decorators.
- **Manual Implementation**: All core business logic—including the **atomic enrollment transactions**, **FIFO waitlist promotion engine**, **Kick-Request workflow**, and **RBAC middleware guards**—was implemented manually from scratch.
- **Tools Used**: Claude Sonnet 4.6 (via structured prompting).

### Total AI Contribution: 22.0%
This percentage reflects a focus on UI/UX scaffolding while ensuring that all critical system logic remains entirely custom-written and original.
