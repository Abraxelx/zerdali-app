from flask import Flask, request
from flask_cors import CORS

from config import Config


def init_cors(app: Flask) -> None:
    CORS(
        app,
        resources={r"/*": {"origins": Config.CORS_ORIGINS}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Content-Type"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        max_age=86400,
    )

    @app.after_request
    def add_cors_headers(response):
        """Ensure CORS headers on error responses too."""
        if response.headers.get("Access-Control-Allow-Origin"):
            return response
        origin = request.headers.get("Origin")
        if origin in Config.CORS_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return response
