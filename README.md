# WiseU

## About WiseU

WiseU is a **Wise Campus Life Assistant** For **University Students**.

This is a developing group project in 2024 CNTDxDLUFL Hackathon.

## Project Structure
```plaintext
wiseu/
├── backend/  (Backend project folder)
│   ├── src/
│   │   ├── controllers/  (Controllers, handle specific requests)
│   │   │   ├── authController.ts  (Authentication management)
│   │   │   ├── serviceController.ts  (Service management)
│   │   │   ├── chatController.ts  (AI conversation interface)
│   │   │   ├── courseController.ts  (Course schedule related interface)
│   │   │   ├── gradeController.ts  (Grade related interface)
│   │   │   └── ...
│   │   ├── models/  (Database models)
│   │   │   ├── user.ts  (User model)
│   │   │   ├── identity.ts  (Identity model)
│   │   │   ├── service.ts  (Service model)
│   │   │   └── ...
│   │   ├── services/  (Business logic layer)
│   │   │   ├── authService.ts
│   │   │   ├── serviceService.ts
│   │   │   ├── chatService.ts
│   │   │   └── ...
│   │   ├── routes/  (Route definitions)
│   │   │   ├── authRoutes.ts
│   │   │   ├── serviceRoutes.ts
│   │   │   ├── chatRoutes.ts
│   │   │   └── ...
│   │   ├── middlewares/  (Middleware)
│   │   ├── utils/  (Utility functions)
│   │   ├── config/  (Configuration files)
│   │   │   ├── dbConfig.ts  (Database configuration)
│   │   │   └── env.ts  (Environment variable configuration)
│   │   ├── integrations/  (Integrations with third-party services and libraries)
│   │   │   ├── langchain.ts
│   │   │   ├── llamaIndex.ts
│   │   │   ├── chromadb.ts
│   │   │   └── ...
│   │   ├── app.ts  (Express application initialization)
│   │   └── server.ts  (Server entry file)
│   ├── tests/  (Test files)
│   └── package.json  (Backend project dependencies configuration)
│
├── frontend/  (Frontend project folder)
│   ├── src/
│   │   ├── components/  (Svelte components)
│   │   │   ├── ChatUI.svelte
│   │   │   ├── CourseTable.svelte
│   │   │   ├── GradeView.svelte
│   │   │   └── ...
│   │   ├── pages/  (Page files)
│   │   │   ├── HomePage.svelte
│   │   │   ├── LoginPage.svelte
│   │   │   ├── SettingsPage.svelte
│   │   │   └── ...
│   │   ├── stores/  (State management)
│   │   ├── routes/  (Route definitions)
│   │   ├── services/  (Interactions with backend APIs)
│   │   │   ├── authService.ts
│   │   │   ├── courseService.ts
│   │   │   └── ...
│   │   └── main.ts  (Application entry)
│   ├── public/  (Static assets)
│   ├── capacitor.config.ts  (Capacitor configuration)
│   └── package.json  (Frontend project dependencies configuration)
│
├── docs/  (Documentation)
│   ├── api/  (API documentation)
│   ├── architecture.md  (Project architecture documentation)
│   ├── setup.md  (Development environment setup guide)
│   └── ...
├── .gitignore  (Git ignore file)
└── README.md  (Project description)
```

During the development process, the actual project structure may vary, and this document will not be modified until the functionality is officially launched.