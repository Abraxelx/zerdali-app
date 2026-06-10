from routes.auth_routes import auth_bp
from routes.group_routes import group_bp
from routes.lesson_routes import lesson_bp
from routes.assignment_routes import assignment_bp
from routes.gamification_routes import gamification_bp
from routes.admin_routes import admin_bp

ALL_BLUEPRINTS = [auth_bp, group_bp, lesson_bp, assignment_bp, gamification_bp, admin_bp]
