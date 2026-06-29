import { environment } from '../../../environments/environment';

/** Backend base URL — from env/.env via scripts/generate-env.mjs */
export const API_BASE_URL = environment.apiBaseUrl;

/** Default role for public registration (env DEFAULT_SIGNUP_ROLE) */
export const DEFAULT_SIGNUP_ROLE = environment.defaultSignupRole;
