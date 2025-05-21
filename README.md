# kortexa.ai Authentication Provider

A simple, flexible authentication provider for Firebase Auth with SSO support.

## Features

- 🔐 **Multiple Authentication Methods**: Email/password, Google, GitHub, Twitter
- 🔄 **SSO Support**: Acts as both SSO provider and consumer
- 🧩 **Flexible UI**: Use pre-built login UI or create your own
- 🔌 **Easy Integration**: Simple React context-based API

## Installation

```bash
npm install @kortexa/auth firebase
```

## Quick Start

### Basic Usage (Standalone Mode)

```jsx
import { AuthProvider } from '@kortexa/auth';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Initialize Firebase
const app = initializeApp({
  apiKey: "your-api-key",
  authDomain: "your-auth-domain.firebaseapp.com",
  // other firebase config
});

const auth = getAuth(app);

function App() {
  return (
    <AuthProvider auth={auth}>
      <AuthProvider.Login title="Welcome to My App">
        <AuthenticatedAppUI />
      </AuthProvider.Login>
    </AuthProvider>
  );
}

// In your authenticated UI
function AuthenticatedAppUI() {
  return (
    ...
  );
}
```

## Authentication Modes

The AuthProvider supports three modes:

### 1. Standalone Mode

Direct Firebase authentication with no SSO interaction.

```jsx
<AuthProvider auth={auth}>
  <AuthProvider.Login title="Welcome to My App">
    <AuthenticatedAppUI />
  </AuthProvider.Login>
</AuthProvider>
```

### 2. SSO Provider Mode

Acts as the authentication source for other applications.
`your-api-server.com` is the URL of your API server.
It should provide an endpoint at `/api/v1/sso` for token exchange.

```jsx
<AuthProvider
  auth={auth}
  loginServer="https://your-api-server.com"
>
  <AuthProvider.Login title="Welcome to My App">
    <AuthenticatedAppUI />
  </AuthProvider.Login>
</AuthProvider>
```

### 3. SSO Consumer Mode

Receives authentication from an SSO provider.
`your-sso-provider.com` is the URL of your SSO provider.
It should return a token in the URL query parameter `token`,
which the SSO consumer will attempt to exchange for a Firebase token.

```jsx
<AuthProvider
  auth={auth}
  loginRedirect="https://your-sso-provider.com"
>
  <AuthProvider.Login title="Welcome to My App">
    <AuthenticatedAppUI />
  </AuthProvider.Login>
</AuthProvider>
```

## Custom Login UI

You can create a custom login UI by using the `useAuth` hook:

```jsx
import { useAuth } from '@kortexa-ai/auth';
import type { SupportedProviders } from '@kortexa-ai/auth';

function MyCustomLoginView({ title, children }) {
  const {
    currentUser,
    loginWithProvider,
    loginWithEmailAndPassword,
    loginWithSSO,
    logout,
    mode
  } = useAuth();

  // If user is already authenticated, render children
  if (currentUser) return children;

  return (
    <div className="my-custom-login-container">
      <h1>{title}</h1>

      {/* Email/Password login form */}
      <form onSubmit={(e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;
        loginWithEmailAndPassword(email, password);
      }}>
        <input name="email" type="email" placeholder="Email" />
        <input name="password" type="password" placeholder="Password" />
        <button type="submit">Login</button>
      </form>

      {/* Social logins */}
      <button onClick={() => loginWithProvider('google')}>
        Login with Google
      </button>

      {/* SSO login (only in SSO consumer mode) */}
      {mode === 'sso-consumer' && (
        <button onClick={loginWithSSO}>
          Login with SSO
        </button>
      )}
    </div>
  );
}
```

Using your custom login component instead of AuthProvider.Login
```jsx
<AuthProvider
  auth={auth}
  loginRedirect="https://your-sso-provider.com"
>
  <MyCustomLoginView title="Welcome to App">
    <AuthenticatedAppUI />
  </MyCustomLoginView>
</AuthProvider>
```

## API Reference

### `AuthProvider` Props

| Prop | Type | Description |
|------|------|-------------|
| `auth` | `Auth` | Firebase Auth instance (required) |
| `loginRedirect` | `string` | URL to redirect for SSO login (for SSO consumer mode) |
| `loginServer` | `string` | API server URL for token exchange (for SSO provider mode) |

### `useAuth` Hook Return Values

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `currentUser` | `User \| null` | Current authenticated Firebase user |
| `token` | `string` | JWT token for the current user |
| `loading` | `boolean` | Authentication loading state |
| `mode` | `'standalone' \| 'sso-provider' \| 'sso-consumer'` | Current auth mode |
| `loginWithProvider` | `(provider: SupportedProviders) => Promise<void>` | Login with social provider |
| `loginWithEmailAndPassword` | `(email: string, password: string) => Promise<void>` | Login with email/password |
| `loginWithSSO` | `() => Promise<void>` | Initiate SSO login flow |
| `logout` | `() => Promise<void>` | Sign out current user |

### Supported Providers

- `'google'`
- `'github'`
- `'twitter'`
- `'apple'`
- `'email'`

Note: X/Twitter and Apple providers are still under development.

## How SSO Works

### As an SSO Provider:

1. User logs in on your application
2. Another application redirects to your app with `?returnUrl=...`
3. Your app exchanges the Firebase token for a domain-specific token
4. User is redirected back to the original application with the token

### As an SSO Consumer:

1. User clicks "Login with SSO" in your application
2. User is redirected to the SSO provider with your app's URL as the return URL
3. After successful authentication on the provider, user is redirected back to your app with a token
4. Your app uses this token to authenticate with Firebase

-------------------
© 2025 kortexa.ai