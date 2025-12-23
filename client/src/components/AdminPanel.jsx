import { useState, useEffect } from 'react';
import { 
  Box, Container, Typography, TextField, Button, Paper, Tabs, Tab, 
  List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { 
  login, getAuthToken, setAuthToken, 
  fetchCategories, fetchPresets, 
  createCategory, deleteCategory, 
  createPreset, updatePreset, deletePreset 
} from '../api/chatService';

export function AdminPanel() {
  const [token, setToken] = useState(getAuthToken());
  const [activeTab, setActiveTab] = useState(0);
  
  // Data State
  const [categories, setCategories] = useState([]);
  const [presets, setPresets] = useState([]);

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

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Categories" />
          <Tab label="Presets" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <CategoryManager categories={categories} onRefresh={refreshData} />
      )}
      {activeTab === 1 && (
        <PresetManager presets={presets} categories={categories} onRefresh={refreshData} />
      )}
    </Container>
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
