from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import activos, uso, planes, ots, planificador, solicitudes, auth

app = FastAPI(
    title="CMMS Zaimella API",
    description="Backend API for the Zaimella CMMS (Fase 1 MVP)",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev, restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(activos.router)
app.include_router(uso.router)
app.include_router(planes.router)
app.include_router(ots.router)
app.include_router(planificador.router)
app.include_router(solicitudes.router)
app.include_router(auth.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to CMMS Zaimella API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

