import { useState, useEffect } from 'react';
import { 
  Box, Container, Typography, TextField, Button, Paper, Tabs, Tab, 
  List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl,
  Grid, Card, CardContent, Switch, Chip, Table, TableBody, TableCell, TableHead, TableRow
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import EmailIcon from '@mui/icons-material/Email';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

import { 
  login, getAuthToken, setAuthToken, 
  fetchCategories, fetchPresets, 
  createCategory, deleteCategory, 
  createPreset, updatePreset, deletePreset,
  fetchAdminStats, fetchUsers, toggleUserBlock, sendUserEmail, generateSupportToken,
  fetchAdminModels, createModel, updateModel, deleteModel,
  fetchMCPServers, createMCPServer, updateMCPServer, deleteMCPServer
} from '../api/chatService';

export function AdminPanel() {
  const [token, setToken] = useState(getAuthToken());
  const [activeTab, setActiveTab] = useState(0);
  
  // Data State
  const [categories, setCategories] = useState([]);
  const [presets, setPresets] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [models, setModels] = useState([]);
  const [mcpServers, setMcpServers] = useState([]);

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);

  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token]);

  const refreshData = async () => {
    try {
      setCategories(await fetchCategories());
      setPresets(await fetchPresets());
      setStats(await fetchAdminStats());
      setUsers(await fetchUsers());
      setModels(await fetchAdminModels());
      setMcpServers(await fetchMCPServers());
    } catch (e) {
      console.error(e);
      if (e.message.includes('401') || e.message.includes('403')) {
        handleLogout();
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await login(username, password);
      if (data.role !== 'admin') {
          throw new Error("Access denied. Admin role required.");
      }
      setToken(data.token);
      setLoginError(null);
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setToken(null);
  };

  if (!token) {
    return (
      <Container maxWidth="xs" sx={{ mt: 10 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>Admin Login</Typography>
          <form onSubmit={handleLogin}>
            <TextField 
              fullWidth label="Username" margin="normal" 
              value={username} onChange={e => setUsername(e.target.value)} 
            />
            <TextField 
              fullWidth label="Password" type="password" margin="normal" 
              value={password} onChange={e => setPassword(e.target.value)} 
            />
            {loginError && <Typography color="error">{loginError}</Typography>}
            <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }}>Login</Button>
          </form>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Admin Dashboard</Typography>
        <Button variant="outlined" color="secondary" onClick={handleLogout}>Logout</Button>
      </Box>

      {stats && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                  <Card sx={{ bgcolor: '#e3f2fd' }}>
                      <CardContent>
                          <Typography color="textSecondary" gutterBottom>Total Users</Typography>
                          <Typography variant="h4">{stats.users}</Typography>
                      </CardContent>
                  </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                  <Card sx={{ bgcolor: '#f3e5f5' }}>
                      <CardContent>
                          <Typography color="textSecondary" gutterBottom>Total Chats</Typography>
                          <Typography variant="h4">{stats.chats}</Typography>
                      </CardContent>
                  </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                  <Card sx={{ bgcolor: '#e8f5e9' }}>
                      <CardContent>
                          <Typography color="textSecondary" gutterBottom>Active Presets</Typography>
                          <Typography variant="h4">{stats.presets}</Typography>
                      </CardContent>
                  </Card>
              </Grid>
          </Grid>
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Users & Access" />
          <Tab label="Categories" />
          <Tab label="Presets" />
          <Tab label="Models" />
          <Tab label="MCP Servers" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <UserManager users={users} onRefresh={refreshData} />
      )}
      {activeTab === 1 && (
        <CategoryManager categories={categories} onRefresh={refreshData} />
      )}
      {activeTab === 2 && (
        <PresetManager presets={presets} categories={categories} onRefresh={refreshData} />
      )}
      {activeTab === 3 && (
        <ModelManager models={models} onRefresh={refreshData} />
      )}
      {activeTab === 4 && (
        <MCPServerManager servers={mcpServers} onRefresh={refreshData} />
      )}
    </Container>
  );
}

// ... (UserManager, CategoryManager, PresetManager remain same)

function ModelManager({ models, onRefresh }) {
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', value: '', provider: 'ollama', baseUrl: 'http://localhost:11434', apiKey: '', contextWindow: 4096
    });

    const handleEdit = (model) => {
        setEditingId(model._id);
        setFormData({ ...model, apiKey: '' }); // Don't show encrypted key
        setOpen(true);
    };

    const handleOpenNew = () => {
        setEditingId(null);
        setFormData({ name: '', value: '', provider: 'ollama', baseUrl: 'http://localhost:11434', apiKey: '', contextWindow: 4096 });
        setOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editingId) {
                await updateModel(editingId, formData);
            } else {
                await createModel(formData);
            }
            setOpen(false);
            onRefresh();
        } catch (e) { alert(e.message); }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this model?")) {
            await deleteModel(id);
            onRefresh();
        }
    };

    return (
        <Box>
            <Button variant="contained" onClick={handleOpenNew} sx={{ mb: 2 }}>Add Model</Button>
            <Paper>
                <List>
                    {models.map(model => (
                        <ListItem key={model._id} divider>
                            <ListItemText 
                                primary={model.name} 
                                secondary={`${model.provider} | ${model.value} | ${model.baseUrl}`} 
                            />
                            <ListItemSecondaryAction>
                                <IconButton onClick={() => handleEdit(model)}><EditIcon /></IconButton>
                                <IconButton onClick={() => handleDelete(model._id)}><DeleteIcon /></IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>
            </Paper>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{editingId ? "Edit Model" : "New Model"}</DialogTitle>
                <DialogContent>
                    <TextField label="Display Name" fullWidth margin="dense" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <TextField label="Model ID (Value)" fullWidth margin="dense" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Provider</InputLabel>
                        <Select value={formData.provider} label="Provider" onChange={e => setFormData({...formData, provider: e.target.value})}>
                            <MenuItem value="ollama">Ollama</MenuItem>
                            <MenuItem value="openai">OpenAI</MenuItem>
                            <MenuItem value="anthropic">Anthropic</MenuItem>
                            <MenuItem value="custom">Custom</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField label="Base URL" fullWidth margin="dense" value={formData.baseUrl} onChange={e => setFormData({...formData, baseUrl: e.target.value})} />
                    <TextField label="API Key (Leave empty to keep unchanged)" fullWidth margin="dense" type="password" value={formData.apiKey} onChange={e => setFormData({...formData, apiKey: e.target.value})} />
                    <TextField label="Context Window" type="number" fullWidth margin="dense" value={formData.contextWindow} onChange={e => setFormData({...formData, contextWindow: parseInt(e.target.value)})} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

function MCPServerManager({ servers, onRefresh }) {
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', type: 'stdio', command: '', url: '', env: ''
    });

    const handleEdit = (server) => {
        setEditingId(server._id);
        setFormData({ 
            ...server, 
            env: server.env ? JSON.stringify(server.env) : '' 
        });
        setOpen(true);
    };

    const handleOpenNew = () => {
        setEditingId(null);
        setFormData({ name: '', type: 'stdio', command: '', url: '', env: '' });
        setOpen(true);
    };

    const handleSave = async () => {
        try {
            const data = { ...formData };
            if (data.env) {
                try {
                   data.env = JSON.parse(data.env);
                } catch(e) {
                    alert("Invalid JSON for ENV");
                    return;
                }
            }
            if (editingId) {
                await updateMCPServer(editingId, data);
            } else {
                await createMCPServer(data);
            }
            setOpen(false);
            onRefresh();
        } catch (e) { alert(e.message); }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this server?")) {
            await deleteMCPServer(id);
            onRefresh();
        }
    };

    return (
        <Box>
            <Button variant="contained" onClick={handleOpenNew} sx={{ mb: 2 }}>Add MCP Server</Button>
            <Paper>
                <List>
                    {servers.map(server => (
                        <ListItem key={server._id} divider>
                            <ListItemText 
                                primary={server.name} 
                                secondary={`${server.type} | ${server.type === 'stdio' ? server.command : server.url}`} 
                            />
                            <ListItemSecondaryAction>
                                <IconButton onClick={() => handleEdit(server)}><EditIcon /></IconButton>
                                <IconButton onClick={() => handleDelete(server._id)}><DeleteIcon /></IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>
            </Paper>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{editingId ? "Edit MCP Server" : "New MCP Server"}</DialogTitle>
                <DialogContent>
                    <TextField label="Name" fullWidth margin="dense" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Type</InputLabel>
                        <Select value={formData.type} label="Type" onChange={e => setFormData({...formData, type: e.target.value})}>
                            <MenuItem value="stdio">Stdio</MenuItem>
                            <MenuItem value="sse">SSE</MenuItem>
                        </Select>
                    </FormControl>
                    {formData.type === 'stdio' ? (
                         <TextField label="Command" fullWidth margin="dense" value={formData.command} onChange={e => setFormData({...formData, command: e.target.value})} />
                    ) : (
                         <TextField label="URL" fullWidth margin="dense" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} />
                    )}
                    <TextField label="Env Vars (JSON)" fullWidth margin="dense" multiline rows={3} value={formData.env} onChange={e => setFormData({...formData, env: e.target.value})} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

function UserManager({ users, onRefresh }) {
    const handleBlock = async (user) => {
        if (window.confirm(`Are you sure you want to ${user.isBlocked ? 'unblock' : 'block'} ${user.username}?`)) {
            await toggleUserBlock(user._id, !user.isBlocked);
            onRefresh();
        }
    };

    const handleEmail = async (user) => {
        const msg = prompt("Enter email message:");
        if (msg) {
            await sendUserEmail(user._id, msg);
            alert("Email sent (mock)!");
        }
    };

    const handleToken = async (user) => {
        const res = await generateSupportToken(user._id);
        alert(`Support Token Generated: ${res.token}`);
    };

    return (
        <Paper>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Username</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user._id}>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.role}</TableCell>
                            <TableCell>
                                <Chip 
                                    label={user.isBlocked ? "Blocked" : "Active"} 
                                    color={user.isBlocked ? "error" : "success"} 
                                    size="small" 
                                />
                            </TableCell>
                            <TableCell align="right">
                                <IconButton onClick={() => handleEmail(user)} title="Send Email">
                                    <EmailIcon />
                                </IconButton>
                                <IconButton onClick={() => handleToken(user)} title="Generate Token">
                                    <VpnKeyIcon />
                                </IconButton>
                                <IconButton onClick={() => handleBlock(user)} color={user.isBlocked ? "primary" : "error"} title={user.isBlocked ? "Unblock" : "Block"}>
                                    <BlockIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Paper>
    );
}

function CategoryManager({ categories, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const handleAdd = async () => {
    try {
      await createCategory({ name: newCatName, description: newCatDesc });
      setOpen(false);
      setNewCatName('');
      setNewCatDesc('');
      onRefresh();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await deleteCategory(id);
      onRefresh();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <Box>
      <Button variant="contained" onClick={() => setOpen(true)} sx={{ mb: 2 }}>Add Category</Button>
      <Paper>
        <List>
          {categories.map(cat => (
            <ListItem key={cat._id} divider>
              <ListItemText primary={cat.name} secondary={cat.description} />
              <ListItemSecondaryAction>
                <IconButton onClick={() => handleDelete(cat._id)} edge="end" aria-label="delete">
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add Category</DialogTitle>
        <DialogContent>
          <TextField 
            autoFocus margin="dense" label="Name" fullWidth 
            value={newCatName} onChange={e => setNewCatName(e.target.value)} 
          />
          <TextField 
            margin="dense" label="Description" fullWidth 
            value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function PresetManager({ presets, categories, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '', description: '', prompt: '', category: '', subCategory: ''
  });

  const handleEdit = (preset) => {
    setEditingId(preset._id);
    setFormData({
      name: preset.name,
      description: preset.description,
      prompt: preset.prompt,
      category: preset.category?._id || preset.category,
      subCategory: preset.subCategory || ''
    });
    setOpen(true);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', prompt: '', category: '', subCategory: '' });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updatePreset(editingId, formData);
      } else {
        await createPreset(formData);
      }
      setOpen(false);
      onRefresh();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this preset?")) return;
    try {
      await deletePreset(id);
      onRefresh();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <Box>
      <Button variant="contained" onClick={handleOpenNew} sx={{ mb: 2 }}>Add Preset</Button>
      <Paper>
        <List>
          {presets.map(preset => (
            <ListItem key={preset._id} divider>
              <ListItemText 
                primary={preset.name} 
                secondary={`${preset.category?.name || 'Uncategorized'} - ${preset.subCategory || ''}`} 
              />
              <ListItemSecondaryAction>
                <IconButton onClick={() => handleEdit(preset)} aria-label="edit">
                  <EditIcon />
                </IconButton>
                <IconButton onClick={() => handleDelete(preset._id)} edge="end" aria-label="delete">
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? "Edit Preset" : "New Preset"}</DialogTitle>
        <DialogContent>
          <TextField 
            margin="dense" label="Name" fullWidth 
            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
          />
          <TextField 
            margin="dense" label="Description" fullWidth 
            value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
          />
           <TextField 
            margin="dense" label="Sub Category" fullWidth 
            value={formData.subCategory} onChange={e => setFormData({...formData, subCategory: e.target.value})} 
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              label="Category"
              onChange={e => setFormData({...formData, category: e.target.value})}
            >
              {categories.map(cat => (
                <MenuItem key={cat._id} value={cat._id}>{cat.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField 
            margin="dense" label="System Prompt" fullWidth multiline rows={4}
            value={formData.prompt} onChange={e => setFormData({...formData, prompt: e.target.value})} 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
