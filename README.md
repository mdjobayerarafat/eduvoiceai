# EduVoice AI: AI-Powered Voice Agents for Education 🎤📚

EduVoice AI is a full-stack SaaS web application designed to revolutionize learning through the power of AI-driven voice agents.

## 🌟 App Features

1.  **Landing Page**:
    *   Title: “EduVoice AI”
    *   Header: “Revolutionize Learning with AI-Powered Voice Agent 🎤📚”
    *   CTA Button: “Get Started” (Navigates to login/register)

2.  **Authentication**:
    *   Users can register/login using email and password.
    *   Supports Google OAuth login.

3.  **Dashboard (After Login)**:
    *   Personalized greeting: “Welcome back, [Username]”
    *   Main navigation buttons for key features:
        *   Topic-Based Lecture
        *   Mock Interview
        *   Question & Answer Prep
        *   Learn Language
        *   Meditation
    *   Displays sections for:
        *   Recent Lectures with timestamps
        *   Interview Feedback List

4.  **AI Topic-Based Lectures**:
    *   Users select a topic.
    *   AI generates a lecture using OpenAI/Gemini/Claude API.
    *   Includes summaries, deep explanations, and relevant embedded YouTube videos for complex subtopics.

5.  **AI Mock Interview**:
    *   Simulates a Zoom-like interview interface.
    *   Uses voice and text conversation via AssemblyAI/WebRTC/Speechly.
    *   Features an AI interviewer avatar named "Joanna".
    *   Generates personalized feedback after the interview.

6.  **API Key Integration**:
    *   Users can link their own API keys from OpenAI, Gemini, and Claude.

7.  **Token Usage & Subscription**:
    *   Each user receives 60,000 free tokens.
    *   Subscription required after free tokens are used: $10/month via Stripe.

## 🛠️ Admin Panel

*   View all registered users.
*   Monitor user activities (topics covered, interviews taken).
*   Issue vouchers and discount offers.

## 🔧 Tech Stack

*   **Frontend**: Next.js + Tailwind CSS (responsive and modern UI)
*   **Backend**: Golang using the Gin framework with SQLite3 as the database
*   **Authentication**: Firebase Auth or custom OAuth with Google
*   **Hosting**: Vercel (frontend) and Render/Fly.io/Cloud Run (for Golang backend)

## ☁️ Data Model Suggestions (SQLite)

*   `users`: id, name, email, plan, token_usage, api_keys, role
*   `lectures`: id, user_id, topic, summary, video_links, created_at
*   `interviews`: id, user_id, transcript, feedback, date
*   `vouchers`: id, code, discount_percent, user_id, expiry_date

## Getting Started

