# OCR AI Assistant

A powerful OCR (Optical Character Recognition) application that combines advanced text extraction with AI-powered chat capabilities. Built with React.js frontend and FastAPI backend, featuring intelligent document processing and conversational AI.

## 🚀 Features

### Frontend (React.js)
- **Modern UI**: Clean, responsive interface built with Tailwind CSS
- **Document Upload**: Drag-and-drop PDF upload with real-time processing status
- **Text Editor**: Interactive text editing with syntax highlighting
- **AI Chat**: Integrated chat interface for document analysis and Q&A
- **Document Management**: View, edit, and manage processed documents
- **Real-time Updates**: Live processing status and progress indicators

### Backend (FastAPI)
- **Dual OCR Engine**: Intelligent switching between standard OCR and Google Vision API
- **Arc Diagram Detection**: Automatic identification and specialized processing of technical drawings
- **AI Integration**: Mistral AI for intelligent text processing and chat responses
- **RESTful API**: Comprehensive endpoints for document and chat operations
- **Async Processing**: Non-blocking document processing with status tracking

## 📋 Prerequisites

- **Python 3.8+**
- **Node.js 16+** and npm
- **Poppler** (for PDF processing)
- **Mistral AI API Key**
- **Google Cloud Vision API** credentials (for enhanced diagram processing)

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd ocrapillm
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
```

### 3. Environment Configuration
- Place your Google Cloud Vision API credentials file as `backend/google_credentials.json`
- Mistral API key is pre-configured in the system

### 4. Frontend Setup
```bash
cd frontend
npm install
```

## 🚀 Running the Application

### Start Backend Server
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Start Frontend Development Server
```bash
cd frontend
npm start
```

Access the application at `http://localhost:3000`

## 📁 Project Structure

```
ocrapillm/
├── backend/
│   ├── main.py                          # FastAPI application entry point
│   ├── ocr_engine_clean.py             # Standard OCR processing engine
│   ├── ocr_llm_engine.py               # AI-enhanced OCR processing
│   ├── arc_diagram_separation.py       # Arc diagram detection and separation
│   ├── text_extraction_from_diagram.py # Google Vision API integration
│   ├── requirements.txt                # Python dependencies
│   └── sample_image/                   # Test images
├── frontend/
│   ├── src/
│   │   ├── App.js                      # Main React application
│   │   ├── components/                 # React components
│   │   ├── context/                    # React context providers
│   │   └── services/                   # API service functions
│   ├── package.json                    # Node.js dependencies
│   └── tailwind.config.js             # Tailwind CSS configuration
└── README.md
```

## 💡 Usage

1. **Upload Document**: Drag and drop a PDF file or click to browse
2. **Processing**: The system automatically detects document type and applies appropriate OCR
3. **Review Text**: Edit extracted text in the built-in editor
4. **AI Chat**: Ask questions about the document content
5. **Export**: Save processed text or continue with additional documents

## ⚙️ Configuration

### OCR Engine Selection
The system automatically chooses the best OCR method:
- **Standard OCR**: For regular text documents
- **Google Vision API**: For complex diagrams and technical drawings
- **Hybrid Processing**: Combines both methods for optimal results

### API Endpoints
- `POST /upload-pdf/`: Upload and process PDF documents
- `POST /chat/`: AI chat functionality
- `GET /health/`: System health check
- `GET /jobs/{job_id}/status/`: Check processing status

## 🔧 Development

### Frontend Development
- Built with React 18 and modern hooks
- Styled with Tailwind CSS for responsive design
- Uses Axios for API communication

### Backend Development
- FastAPI with async/await support
- Modular architecture for easy extension
- Comprehensive error handling and logging

## 🚀 Production Deployment

### Environment Variables
```bash
# Backend
PORT=8001
HOST=0.0.0.0

# Frontend
REACT_APP_API_URL=http://your-backend-url:8001
```

### Docker Support
Docker configurations can be added for containerized deployment.

## 🔒 Security

- API credentials stored securely outside version control
- Input validation on all endpoints
- CORS properly configured for production
- Sensitive files excluded via `.gitignore`

## 🐛 Troubleshooting

### Common Issues

1. **OCR Processing Fails**
   - Verify Google Cloud Vision API credentials
   - Check Mistral API connectivity
   - Ensure Poppler is properly installed
   - Review backend logs for detailed errors

2. **Frontend Connection Issues**
   - Confirm backend server is running on port 8001
   - Check CORS configuration
   - Verify API endpoint URLs

3. **Upload Problems**
   - Ensure PDF files are not corrupted
   - Check file size limits
   - Verify sufficient disk space

### Logging
- Backend: Check console output for processing details
- Frontend: Use browser developer tools for client-side issues

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation
- Review troubleshooting section

---

**Built with ❤️ using React.js, FastAPI, and AI technologies**