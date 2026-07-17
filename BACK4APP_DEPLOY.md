# Deploy Backend to Back4App!

## Step 1: Sign Up / Log In to Back4App
Go to: https://www.back4app.com
Create an account or log in!

## Step 2: Create a new Back4App
1. On the Back4App Dashboard, click **Create a new app**
2. Select **Node.js** as your framework
3. Name your app `house-of-viyara-backend`
4. Click **Create**!

## Step 3: Deploy your Backend Code!
### Option 1: GitHub Integration (Recommended!)
1. In your new Back4App, go to **Deploy > Git Integration**
2. Connect your GitHub account
3. Select your repository and main branch
4. **IMPORTANT**: Set the **Root Directory** to `backend` (your backend is in the `backend/` folder of your repo!)
5. Click **Save & Deploy**!

### Option 2: Upload via ZIP
1. Zip the `backend` folder (make sure you include `package.json` and `server.js`)
2. In Back4App, go to **Deploy > Manual Deploy**
3. Upload your zipped backend folder
4. Click **Deploy**!

## Step 4: Configure Environment Variables (MOST IMPORTANT!)
1. In your Back4App, go to **App Settings > Environment Variables**
2. Add all variables from your local `.env` file, including:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `JWT_SECRET`
   - `CLOUDINARY_URL` (if using Cloudinary)
   - Any other variables you have in your `.env` file!
3. Click **Save**!

## Step 5: Update your Frontend to use the Back4App Backend URL!
Once deployed, Back4App will give you a URL like:
`https://house-of-viyara-backend.back4app.io`

Update your frontend/admin panel to use this URL instead of `http://localhost:3000`!

## Step 6: Test!
Everything should work now! 🚀
