Run the app locally

1. One-click launch (recommended for clients)

   Double-click `start-local.bat`.
   - This will start a local static server on `http://127.0.0.1:5501`
   - It will open the storefront and admin panel automatically

2. Manual launch (if you prefer)

   Open both pages through the same origin:
   ```text
   http://127.0.0.1:5501/index.html
   http://127.0.0.1:5501/admin.html
   ```

Notes
- The admin panel works without any backend server.
- Admin data is stored in browser `localStorage`, which is shared only when both pages use the same origin.
- `start-local.bat` is the easiest option for non-technical users.
- If you want server-side features later, the optional backend in the `backend` folder can still be used.
