# OCR AI Assistant

A professional React.js frontend with FastAPI backend for OCR document processing and AI-powered document analysis. This application allows users to upload PDF documents, extract text using advanced OCR technology, validate and edit the extracted content, and chat with an AI assistant about the document.

## 🌟 Features

### Frontend (React.js)
- **Modern UI**: Clean, responsive design with dark/light mode
- **PDF Upload**: Drag & drop interface with file validation
- **OCR Processing**: Real-time processing status with progress indicators
- **Text Editor**: Advanced text editing with search, syntax highlighting, and keyboard shortcuts
- **Document Management**: History panel with search, filter, and export capabilities
- **AI Chatbot**: Interactive chat interface for document Q&A
- **Mobile Responsive**: Optimized for desktop, tablet, and mobile devices

### Backend (FastAPI)
- **Document Processing**: PDF upload and OCR text extraction
- **RESTful API**: Clean API endpoints for all operations
- **Real-time Status**: Processing status tracking
- **Chat Integration**: AI-powered document analysis
- **Export Functionality**: Multiple export formats (TXT, DOCX)

### OCR Engine
- **AI-Powered**: Uses Mistral Pixtral API for advanced text extraction and document analysis
- **Multi-format Support**: Handles text, tables, and diagrams
- **High Accuracy**: Processes complex layouts and handwriting
- **Batch Processing**: Efficient multi-page document handling
- **Intelligent Chat**: Real-time document analysis with Mistral AI for accurate Q&A

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Python 3.8+
- Mistral API key (for AI-powered document analysis)
- Poppler (for PDF processing)

### Installation

1. **Clone the repository**
   ```bash
   cd d:\trae\ocrapillm
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd ../backend
   pip install -r requirements.txt
   ```

4. **Setup Environment**
   ```bash
   # The application uses Mistral API for AI functionality
   # API key is already configured in the backend
   # No additional setup required for AI features
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   The API will be available at `http://localhost:8000`

2. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm start
   ```
   The application will open at `http://localhost:3000`

3. **Access the Application**
   - Open your browser to `http://localhost:3000`
   - Upload a PDF document
   - Wait for OCR processing to complete
   - Edit the extracted text and chat with the AI assistant

## 📁 Project Structure

```
ocrapillm/
├── frontend/                 # React.js frontend
│   ├── public/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── context/         # State management
│   │   ├── services/        # API services
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
├── backend/                  # FastAPI backend
│   ├── main.py              # Main API server
│   ├── requirements.txt
│   ├── uploads/             # Uploaded files
│   └── outputs/             # Exported files
├── ocr_llm_engine.py        # OCR processing engine
├── ocr_output/              # OCR results
└── README.md
```

## 🎯 Usage Guide

### 1. Upload Document
- Click "Upload" tab or drag & drop a PDF file
- Supported formats: PDF (max 50MB)
- Wait for upload and processing to complete

### 2. Review and Edit Text
- Switch to "Editor" tab to view extracted text
- Use search functionality (Ctrl+F)
- Edit text directly in the editor
- Save changes (Ctrl+S)
- Export to TXT or DOCX format

### 3. Chat with AI
- Switch to "Chat" tab
- Ask questions about the document content
- Get summaries, find specific information
- View chat history

### 4. Manage Documents
- View all processed documents in "Documents" tab
- Search and filter documents
- Delete or export documents
- Access previous processing results

## 🔧 Configuration

### Frontend Configuration
Edit `frontend/src/services/api.js` to change API settings:
```javascript
const API_BASE_URL = 'http://localhost:8000';
```

### Backend Configuration
Edit `backend/main.py` for server settings:
```python
# CORS settings
allow_origins=["http://localhost:3000"]

# File upload limits
max_file_size = 50 * 1024 * 1024  # 50MB
```

### OCR Engine Configuration
Edit `ocr_llm_engine.py` for OCR settings:
```python
MODEL_NAME = "pixtral-12b-2409"  # Mistral Pixtral model
DPI = 200
MAX_PAGES = None
API_KEY = "your-mistral-api-key"  # Configure your Mistral API key
```

## 🎨 Customization

### Styling
- Edit `frontend/tailwind.config.js` for theme customization
- Modify `frontend/src/index.css` for custom styles
- Update color scheme in the config file

### Components
- All React components are in `frontend/src/components/`
- Each component is self-contained and reusable
- State management uses React Context API

## 🔍 API Endpoints

### Document Management
- `POST /upload/` - Upload and process PDF
- `GET /documents/` - Get all documents
- `GET /documents/{id}/content` - Get document content
- `DELETE /documents/{id}` - Delete document

### Text Processing
- `POST /validate/{id}` - Update validated text
- `GET /documents/{id}/export` - Export document

### Chat Interface
- `POST /chat/{id}` - Send chat message for specific document
- `POST /chat/all` - Send chat message for all documents
- `GET /documents/{id}/chat` - Get chat history

### System
- `GET /health` - Health check
- `GET /` - API information

## 🛠️ Development

### Frontend Development
```bash
cd frontend
npm start          # Start dev server
npm run build      # Build for production
npm test           # Run tests
```

### Backend Development
```bash
cd backend
python main.py     # Start with auto-reload
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Code Style
- Frontend: ESLint + Prettier
- Backend: Black + isort
- Use meaningful component and variable names
- Follow React hooks best practices

## 🚀 Production Deployment

### Frontend
```bash
cd frontend
npm run build
# Deploy the 'build' folder to your web server
```

### Backend
```bash
cd backend
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Environment Variables
Create `.env` files for production:

**Frontend (.env.production)**
```
REACT_APP_API_URL=https://your-api-domain.com
```

**Backend (.env)**
```
ENVIRONMENT=production
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

## 🔒 Security Considerations

- File upload validation and size limits
- CORS configuration for production
- Input sanitization for chat messages
- Rate limiting for API endpoints
- Secure file storage and cleanup

## 🐛 Troubleshooting

### Common Issues

1. **OCR Processing Fails**
   - Check Mistral API connectivity and key validity
   - Verify Poppler installation for PDF processing
   - Check backend logs for API errors

2. **Frontend Can't Connect to Backend**
   - Check if backend is running on port 8000
   - Verify CORS settings in `main.py`
   - Check browser console for network errors

3. **File Upload Issues**
   - Ensure file is PDF format and under 50MB
   - Check backend logs for processing errors
   - Verify upload directory permissions

### Logs
- Frontend: Browser developer console
- Backend: Terminal output where server is running
- OCR Engine: Check console output during processing

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Check the troubleshooting section
- Review API documentation
- Create an issue on GitHub

---

**Built with ❤️ using React.js, FastAPI, and Mistral AI**