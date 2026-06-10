import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, jsonify

from config import Config
from extensions import init_cors
from routes import ALL_BLUEPRINTS
from utils.errors import register_error_handlers


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    init_cors(app)
    register_error_handlers(app)

    for bp in ALL_BLUEPRINTS:
        app.register_blueprint(bp)

    @app.route("/health")
    def health():
        return jsonify({"status": "ok", "service": "zerdali-api"})

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT, debug=True)
