import { useState, useRef, useEffect, ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { Box, TextField, IconButton, Badge, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import CloseIcon from '@mui/icons-material/Close';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ChatInputProps {
  onSend: (content: string, files: File[]) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        setIsSpeechRecognitionSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                setValue(prev => prev + (prev ? ' ' : '') + finalTranscript);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
    } else {
        setIsSpeechRecognitionSupported(false);
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() || files.length > 0) {
      onSend(value, files);
      setValue('');
      setFiles([]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const newFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...newFiles].slice(0, 10)); 
    }
  };

  const removeFile = (index: number) => {
      setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleVoice = () => {
      if (!recognitionRef.current) {
          return; // Should be disabled if not supported
      }

      if (isListening) {
          recognitionRef.current.stop();
      } else {
          recognitionRef.current.start();
          setIsListening(true);
      }
  };

  return (
    <Box 
      component="form"
      onSubmit={handleSubmit}
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        p: 1.5,
        backgroundColor: '#fff',
        borderTop: '1px solid #e0e0e0',
        position: 'sticky',
        bottom: 0,
        zIndex: 10
      }}
    >
      {files.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', mb: 1, pb: 0.5 }}>
              {files.map((f, i) => (
                  <Badge 
                    key={i} 
                    badgeContent={<CloseIcon fontSize="small" onClick={() => removeFile(i)} sx={{ cursor: 'pointer', bgcolor: '#eee', borderRadius: '50%' }} />}
                  >
                      <Box sx={{ 
                          p: 1, border: '1px solid #ddd', borderRadius: 2, 
                          fontSize: '0.75rem', whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' 
                        }}>
                          {f.name}
                      </Box>
                  </Badge>
              ))}
          </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
        <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
        />
        <Tooltip title="Attach Files (Images, Docs, PDF)">
            <IconButton onClick={() => fileInputRef.current?.click()} disabled={disabled} sx={{ mr: 1, mb: 0.5 }}>
                <AttachFileIcon />
            </IconButton>
        </Tooltip>

        <Tooltip title={isSpeechRecognitionSupported ? (isListening ? "Stop Listening" : "Start Voice Input") : "Speech recognition not supported"}>
            <IconButton 
                onClick={toggleVoice} 
                color={isListening ? "secondary" : "default"} 
                disabled={disabled || !isSpeechRecognitionSupported} 
                sx={{ mr: 1, mb: 0.5 }}
            >
                {isListening ? <MicOffIcon /> : <MicIcon />}
            </IconButton>
        </Tooltip>

        <TextField
            fullWidth
            variant="outlined"
            placeholder={isListening ? "Listening..." : "Type a message..."}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            autoFocus
            multiline
            maxRows={4}
            size="small"
            sx={{
                '& .MuiOutlinedInput-root': {
                    borderRadius: '24px',
                    backgroundColor: '#f8f9fa',
                    fontSize: '0.95rem',
                    padding: '8px 12px',
                    '& fieldset': { borderColor: '#e0e0e0' },
                    '&:hover fieldset': { borderColor: '#bdbdbd' },
                    '&.Mui-focused fieldset': { borderColor: '#1976d2' },
                }
            }}
        />
        <IconButton 
            type="submit" 
            color="primary" 
            disabled={disabled || (!value.trim() && files.length === 0)}
            size="small"
            sx={{ 
            ml: 1, 
            mb: 0.5,
            bgcolor: (value.trim() || files.length > 0) ? 'primary.main' : 'transparent',
            color: (value.trim() || files.length > 0) ? 'white' : 'action.disabled',
            '&:hover': {
                bgcolor: (value.trim() || files.length > 0) ? 'primary.dark' : 'transparent',
            }
            }}
        >
            <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
