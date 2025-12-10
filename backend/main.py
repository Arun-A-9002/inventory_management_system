# backend/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uuid

from routers import register, auth
from utils.logger import log_error, log_audit, log_api
from routers.department import router as department_router


app = FastAPI(title="NUTRYAH IMS API")


# ----------------------------------------------------------
# CORS
# ----------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------------------------------------
# ROUTERS
# ----------------------------------------------------------
app.include_router(register.router, prefix="/api")
app.include_router(auth.router)
app.include_router(department_router)


# ----------------------------------------------------------
# GLOBAL MIDDLEWARE: API LOGGING + REQUEST ID TRACKING
# ----------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware to track every API request with unique request ID"""

    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    try:
        log_api(
            f"[REQ:{request_id}] {request.method} {request.url} "
            f"FROM {request.client.host}"
        )

        response = await call_next(request)

        # Log success response
        log_api(
            f"[REQ:{request_id}] Completed with status {response.status_code}"
        )

        return response

    except Exception as e:
        log_error(
            e,
            location=f"{request.method} {request.url} | REQ:{request_id}",
        )

        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "request_id": request_id,
            },
        )


# ----------------------------------------------------------
# HEALTH CHECK ROUTE
# ----------------------------------------------------------
@app.get("/")
def health():
    log_audit("Health check OK")
    return {"status": "running"}
