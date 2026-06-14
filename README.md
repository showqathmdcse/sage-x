# AAVA Code

Multi-cloud AI coding assistant CLI - supports Azure OpenAI, Amazon Bedrock, GCP Vertex AI.

**🔐 Secure with Google Sign-In** - Authentication required on startup

## Features

- 🤖 Multi-cloud AI support (Azure OpenAI, Amazon Bedrock, GCP Vertex AI)
- 🔐 **Google Sign-In authentication** (required on startup)
- 💬 Interactive conversation mode
- 🛠️ Code editing and file operations
- 📝 Conversation save/load
- 🎨 Beautiful terminal UI with markdown support
- 🔒 Secure 7-day sessions

## Prerequisites

### Install Node.js (v18+)

**macOS:**

```bash
# Option 1: Using Homebrew (recommended)
brew install node

# Option 2: Using the installer
# Download from https://nodejs.org and run the .pkg file
```

**Windows:**

```bash
# Option 1: Using winget
winget install OpenJS.NodeJS.LTS

# Option 2: Using the installer
# Download from https://nodejs.org and run the .msi file
```

**Linux (Ubuntu/Debian):**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**Verify installation:**

```bash
node -v   # Should show v18.x.x or higher
npm -v    # Should show 9.x.x or higher
```

## Setup

```bash
cd aava-code

# Install dependencies
npm install

# Build the project
npm run build

# Link globally so you can use it from anywhere
npm link
```

## Usage

Once linked, open any terminal and type:

```bash
aava-code
```

It will launch the CLI in whatever directory you're in.

### Commands inside the CLI

- `/provider` - Pick your cloud provider (Azure, Bedrock, Vertex AI)
- `/model` - Switch AI model
- `/config` - Add your credentials
- `/signin` - Sign in with Firebase authentication
- `/signout` - Sign out
- `/auth` - Check authentication status
- `/save [name]` - Save conversation
- `/load [name]` - Load conversation
- `/clear` - Clear conversation history
- `/tokens` - Show token usage
- `/help` - Show all commands
- `/exit` - Exit the CLI

## Firebase Authentication Setup

**Authentication is now REQUIRED** - you must sign in with Google to use AAVA Code.

### Quick Setup:

1. **Get Firebase service account key** from [Firebase Console](https://console.firebase.google.com/)
   - Select project: **sage-x-ff6be**
   - Settings → Service Accounts → Generate New Private Key
   - Save as `firebase-service-account.json` in project root

2. **Enable Google Sign-In** in Firebase Console
   - Authentication → Sign-in method
   - Enable "Google"

3. **You already have** `google-services.json` ✓

4. **Verify setup**:
   ```bash
   npm run check-firebase
   ```

5. **Start the CLI**:
   ```bash
   npm start
   ```
   - Browser will open automatically for Google Sign-In
   - Sign in with your Google account
   - Return to terminal and start coding!

For detailed setup instructions, see [GOOGLE_AUTH_UPDATE.md](GOOGLE_AUTH_UPDATE.md)

## Development

```bash
# Run without building (uses ts-node)
npm run dev
```
