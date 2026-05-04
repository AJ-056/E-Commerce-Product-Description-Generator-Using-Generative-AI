# SparkCopy ⚡️

SparkCopy is an AI-powered product description generator designed to help e-commerce brands and marketers create compelling, SEO-optimized copy in seconds. By turning product features into persuasive narratives, SparkCopy enables you to scale your content production while maintaining high quality across various platforms.

## ✨ Features

- **AI-Powered Generation**: Leverages Google's Gemini models to create high-converting product descriptions.
- **Multi-Language Support**: Generate content in over 9 languages, including English, Spanish, French, German, Japanese, and more.
- **Platform Tailoring**: Specifically optimized prompts for Amazon, Shopify, Instagram, and generic marketplace use.
- **Custom Instructions**: Provide specific keywords or directions (e.g., "focus on durability," "use a storytelling approach") to fine-tune the output.
- **Dark Mode**: A beautiful, transition-aware dark interface for late-night copywriting sessions.
- **Generation History**: Save and manage your previous generations securely using Firebase Firestore.
- **Authentication**: Secure sign-in with Google or Email/Password via Firebase Authentication.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Firebase Project (for history and auth)
- A Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory (refer to `.env.example`).
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   ...
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 🛠 Tech Stack

- **Frontend**: React (with Vite), Tailwind CSS, Framer Motion
- **Icons**: Lucide React
- **Backend / DB**: Firebase (Auth & Firestore)
- **AI Engine**: Google Gemini Pro API

## 📝 Usage

1. **Enter Product Details**: Provide the product name and key features.
2. **Configure Tone & Platform**: Choose the voice of your brand and the target destination.
3. **Select Language**: Choose from 9+ supported languages.
4. **Generate**: Click the generate button and watch SparkCopy work its magic.
5. **Copy & Save**: Copy the result to your clipboard or find it later in your history tab.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
