Run the app locally

1. Start the backend server (only needed once per session)

   Open `start-backend.bat` (double-click) or run:

   ```powershell
   cd "e:\Life Style\backend"
   npm start
   ```

2. Open the admin panel (once backend is running):

   Double-click `start-admin.bat` or open in browser:

   ```text
   http://127.0.0.1:3000/admin.html
   ```

Notes
- `start-backend.bat` will open a new terminal and run `npm start` for you.
- `start-admin.bat` attempts to open Chrome; edit the path if you use another browser.
- To run on a real domain, deploy the `backend` to a server and set `API_URL` accordingly.
