import { useState, useEffect, SyntheticEvent } from 'react';
import { Dialog, DialogTitle, DialogContent, Tabs, Tab, Box, Card, CardContent, Typography, Button, Grid, Chip, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ICategory, IPreset } from '../types';

interface PresetSelectorProps {
  open: boolean;
  onClose: () => void;
  categories: ICategory[];
  presets: IPreset[];
  onSelectPreset: (preset: IPreset | null) => void;
}

export function PresetSelector({ open, onClose, categories, presets, onSelectPreset }: PresetSelectorProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    // Set the initial tab selection when categories are loaded
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0]._id);
    }
  }, [categories, selectedCategoryId]);


  const handleTabChange = (_event: SyntheticEvent, newValue: string) => {
    setSelectedCategoryId(newValue);
  };

  const handleSelect = (preset: IPreset | null) => {
    onSelectPreset(preset);
    onClose();
  };

  const filteredPresets = presets.filter(p => {
    if (typeof p.category === 'object' && p.category !== null) {
      return p.category._id === selectedCategoryId;
    }
    return p.category === selectedCategoryId;
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ py: 1.5, fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Select a Persona
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={selectedCategoryId} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" sx={{ minHeight: '36px', '& .MuiTab-root': { py: 0.5, minHeight: '36px', fontSize: '0.85rem' } }}>
            {categories.map(cat => (
              <Tab label={cat.name} value={cat._id} key={cat._id} />
            ))}
          </Tabs>
        </Box>
        <Box sx={{ minHeight: '350px' }}>
          <Grid container spacing={1.5}>
            {/* General Chat Option */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 2 }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography gutterBottom variant="subtitle1" component="h2" sx={{ lineHeight: 1.1, fontWeight: 500, fontSize: '1rem' }}>
                    General Chat
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                    Start a fresh conversation without any specific persona or system prompt.
                  </Typography>
                </CardContent>
                <Box sx={{ p: 1.5, pt: 0 }}>
                  <Button
                    variant="outlined"
                    onClick={() => handleSelect(null)}
                    fullWidth
                    size="small"
                    sx={{ fontSize: '0.8rem', py: 0.5 }}
                  >
                    Start General Chat
                  </Button>
                </Box>
              </Card>
            </Grid>

            {filteredPresets.map(preset => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={preset._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 2 }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Typography gutterBottom variant="subtitle1" component="h2" sx={{ lineHeight: 1.1, fontWeight: 500, fontSize: '1rem' }}>
                        {preset.name}
                        </Typography>
                    </Box>
                    {preset.subCategory && (
                        <Chip label={preset.subCategory} size="small" color="primary" variant="outlined" sx={{ mb: 0.5, height: '20px', fontSize: '0.7rem' }} />
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                      {preset.description}
                    </Typography>
                  </CardContent>
                  <Box sx={{ p: 1.5, pt: 0 }}>
                    <Button
                      variant="contained"
                      onClick={() => handleSelect(preset)}
                      fullWidth
                      size="small"
                      sx={{ fontSize: '0.8rem', py: 0.5 }}
                    >
                      Start Chat
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
            {filteredPresets.length === 0 && (
                <Box sx={{ p: 2, width: '100%', textAlign: 'center' }}>
                    <Typography color="text.secondary" variant="body2">No presets in this category.</Typography>
                </Box>
            )}
          </Grid>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
