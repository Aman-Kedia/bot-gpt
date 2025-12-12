# 🤖 GPT Conversational Backend  
A Node.js backend for chat-based applications, supporting:

- Multi-user conversation history  
- Email-based authorization  
- HuggingFace Router (OpenAI-style Chat API)  
- AI-generated responses  
- Clean, scalable architecture  

Perfect for building apps similar to ChatGPT, customer support bots, or AI assistants.

---

## 🚀 Overview
This backend manages:

- Users  
- Conversations per user  
- Messages inside each conversation  
- HuggingFace-generated assistant replies  

The backend enforces **ownership security**:  
Users can only access their own conversations.

---

## ⭐ Features

### ✔ User Management
- Create user  
- Fetch user  

### ✔ Conversations
- Create conversation  
- List conversations  
- List conversations for one user  
- Fetch messages (with ownership check)  
- Delete conversation (soft delete)

### ✔ Messaging
- Add message  
- Auto-generate assistant reply using HuggingFace Chat API  

### ✔ Authorization
- Every conversation requires `user_email` validation  
- Prevents unauthorized access (`403 Forbidden`)

---

## 🛠 Tech Stack

| Area | Technology |
|------|------------|
| Backend | Node.js, Express |
| Database | MongoDB + Mongoose |
| LLM | HuggingFace Router (`v1/chat/completions`) |
| Logging | Morgan |
| HTTP Tools | CORS, axios |
| Architecture | Controller-Service-Model |

---

## 📂 Folder Structure

src/
│
├── controllers/
│ ├── userController.js
│ └── conversationController.js
│
├── models/
│ ├── User.js
│ ├── Conversation.js
│ └── Message.js
│
├── routes/
│ ├── users.js
│ └── conversations.js
│
├── services/
│ └── llmService.js
│
├── db.js
└── index.js

---

## 🔧 Environment Variables

Create a `.env` file:
```bash
PORT=3000
MONGODB_URI=your_mongo_connection_string
LLM_PROVIDER_URL=https://router.huggingface.co/v1/chat/completions
LLM_MODEL=openai/gpt-oss-20b:groq
LLM_API_KEY=hf_xxxxxxxxxxxxx
```

---

## 📥 Installation

```bash
git clone https://github.com/<your-username>/<repo>.git
cd <repo>
npm install
```

---

## ▶ Run the Server 

```bash
node src/index.js
```

Expected output:
```bash
Connected to MongoDB
Server listening on 3000
```

---

## 🧪 Testing

✔ Create User
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Aman\",\"email\":\"aman@example.com\"}"
```

✔ Create Conversation
```bash
curl -X POST http://localhost:3000/conversations \
  -H "Content-Type: application/json" \
  -d "{\"user_email\":\"aman@example.com\",\"first_message\":\"Hello\"}"
```

✔ Add Message
```bash
curl -X POST http://localhost:3000/conversations/<ID>/messages \
  -H "Content-Type: application/json" \
  -d "{\"user_email\":\"aman@example.com\",\"text\":\"Tell me a joke\"}"
```

✔ Fetch User Conversations
```bash
curl http://localhost:3000/conversations/user/aman@example.com
```

✔ Fetch Conversation Messages
```bash
curl "http://localhost:3000/conversations/<ID>?user_email=aman@example.com"
```

---

## 🤖 HuggingFace Chat Example

This backend sends:
```bash
{
  "model": "openai/gpt-oss-20b:groq",
  "messages": [
    { "role": "system", "content": "You are an assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "stream": false
}
```

Using:


https://router.huggingface.co/v1/chat/completions

