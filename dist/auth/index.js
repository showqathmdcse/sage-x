"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthUI = exports.authUI = exports.AuthUI = exports.firebaseAuth = exports.FirebaseAuth = void 0;
// ============================================
// Authentication Module Exports
// ============================================
var firebase_auth_1 = require("./firebase-auth");
Object.defineProperty(exports, "FirebaseAuth", { enumerable: true, get: function () { return firebase_auth_1.FirebaseAuth; } });
Object.defineProperty(exports, "firebaseAuth", { enumerable: true, get: function () { return firebase_auth_1.firebaseAuth; } });
var auth_ui_1 = require("./auth-ui");
Object.defineProperty(exports, "AuthUI", { enumerable: true, get: function () { return auth_ui_1.AuthUI; } });
Object.defineProperty(exports, "authUI", { enumerable: true, get: function () { return auth_ui_1.authUI; } });
Object.defineProperty(exports, "createAuthUI", { enumerable: true, get: function () { return auth_ui_1.createAuthUI; } });
//# sourceMappingURL=index.js.map