
import { Paper, Typography, Box, Avatar, Chip } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { IMessage } from '../types';

interface MessageProps {
  message: IMessage;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const attachments = message.attachments || [];

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', maxWidth: '80%', flexDirection: isUser ? 'row-reverse' : 'row' }}>
        <Avatar sx={{ bgcolor: isUser ? 'secondary.main' : 'primary.main', [isUser ? 'ml' : 'mr']: 1.5 }}>
          {isUser ? 'U' : 'A'}
        </Avatar>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
            <Paper
            variant="outlined"
            sx={{
                p: 2,
                bgcolor: isUser ? '#E3F2FD' : '#F3F3F3',
                border: 'none',
                borderRadius: '16px', 
                wordWrap: 'break-word',
                '& p': { m: 0, mb: 0.5 },
                '& p:last-child': { mb: 0 },
                '& pre': { m: '6px 0', p: 0, borderRadius: '8px', overflowX: 'auto' },
                '& code': { fontFamily: 'monospace' }
            }}
            >
            {isUser ? (
                <Typography variant="body1" sx={{whiteSpace: 'pre-wrap', fontSize: '0.95rem'}}>{message.content}</Typography>
            ) : (
                <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p({ children, ...props }) {
                        return <Typography variant="body1" sx={{fontSize: '0.95rem'}} {...props}>{children}</Typography>
                    },
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      const isInline = !match;
                      const { ref, ...rest } = props as any;
                      return !isInline ? (
                          <SyntaxHighlighter
                          style={oneDark as any}
                          language={match[1]}
                          PreTag="div"
                          {...rest}
                          >
                          {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                      ) : (
                          <code className={className} {...rest} style={{backgroundColor: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: '4px'}}>
                          {children}
                          </code>
                      )
                    }
                }}
                >
                {message.content}
                </ReactMarkdown>
            )}
            </Paper>

            {attachments.length > 0 && (
                <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                    {attachments.map((att, i) => (
                        <Chip 
                            key={i} 
                            icon={<AttachFileIcon sx={{fontSize: 14}} />} 
                            label={att.filename} 
                            size="small" 
                            variant="outlined" 
                            sx={{ fontSize: '0.75rem', maxWidth: 150 }}
                        />
                    ))}
                </Box>
            )}
            
            {message.timestamp && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
              </Typography>
            )}
        </Box>
      </Box>
    </Box>
  );
}
