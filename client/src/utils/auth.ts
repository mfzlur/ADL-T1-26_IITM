// In-memory token store (no localStorage — avoids XSS risk)
let token: string | null = null;

export const setToken = (t: string) => { token = t; };
export const getToken = () => token;
export const clearToken = () => { token = null; };

export const parseJwt = (t: string) => {
    try {
        return JSON.parse(atob(t.split('.')[1]));
    } catch {
        return null;
    }
};
