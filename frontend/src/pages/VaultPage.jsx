import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { JSEncrypt } from 'jsencrypt';
import {
    AppBar, Toolbar, Typography, Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    Divider, TextField, Button, Grid, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText,
    DialogActions, Select, MenuItem, InputLabel, FormControl, CircularProgress, Tooltip
} from '@mui/material';
import {
    Folder as FolderIcon, Group as GroupIcon, AddCircle as AddCircleIcon, Logout as LogoutIcon,
    Share as ShareIcon, VpnKey as VpnKeyIcon
} from '@mui/icons-material';

const DRAWER_WIDTH = 280;
const ENCRYPTION_KEY_SIZE = 256 / 32;
const PBKDF2_ITERATIONS = 100000;

const VaultPage = () => {
    const navigate = useNavigate();
    
    const [session, setSession] = useState(null);
    const [encryptionKey, setEncryptionKey] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const [secrets, setSecrets] = useState([]);
    const [folders, setFolders] = useState([]);
    const [groups, setGroups] = useState([]);
    const [sharedSecrets, setSharedSecrets] = useState([]);
    const [groupKeys, setGroupKeys] = useState({});

    const [selectedGroup, setSelectedGroup] = useState(null);
    const [openDialog, setOpenDialog] = useState(null);
    const [formData, setFormData] = useState({});
    const [secretToShare, setSecretToShare] = useState(null);
    
    const init = useCallback(() => {
        const sessionDataString = sessionStorage.getItem('sessionData');
        if (!sessionDataString) {
            navigate('/unlock');
            return;
        }
        const parsedSession = JSON.parse(sessionDataString);
        setSession(parsedSession);

        const { masterPassword, salt } = parsedSession;
        if (masterPassword && salt) {
            const derivedKey = CryptoJS.PBKDF2(masterPassword, salt, { keySize: ENCRYPTION_KEY_SIZE, iterations: PBKDF2_ITERATIONS });
            setEncryptionKey(derivedKey);
        }
    }, [navigate]);

    useEffect(() => {
        init();
    }, [init]);

    const fetchData = useCallback(async (key, token) => {
        setIsLoading(true);
        try {
            const [secretsRes, foldersRes, groupsRes, sharesRes] = await Promise.all([
                axios.get('http://localhost:3001/api/secrets', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:3001/api/folders', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:3001/api/groups', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:3001/api/shares', { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            setFolders(foldersRes.data.map(f => ({ ...f, name: CryptoJS.AES.decrypt(f.encrypted_name, key, { iv: CryptoJS.enc.Hex.parse(f.iv) }).toString(CryptoJS.enc.Utf8) })));
            setSecrets(secretsRes.data.map(s => ({ ...s, title: CryptoJS.AES.decrypt(s.encrypted_title, key, { iv: CryptoJS.enc.Hex.parse(s.iv) }).toString(CryptoJS.enc.Utf8), username: CryptoJS.AES.decrypt(s.encrypted_username, key, { iv: CryptoJS.enc.Hex.parse(s.iv) }).toString(CryptoJS.enc.Utf8) })));
            setGroups(groupsRes.data);

            const decryptedShares = await Promise.all(sharesRes.data.map(async (share) => {
                const groupKey = await getGroupKey(share.group_id, token);
                if (!groupKey) return { ...share, data: { title: "ERRO: Chave do grupo indisponível" } };
                const decryptedData = CryptoJS.AES.decrypt(share.encrypted_data, groupKey, { iv: CryptoJS.enc.Hex.parse(share.iv) }).toString(CryptoJS.enc.Utf8);
                return { ...share, data: JSON.parse(decryptedData) };
            }));
            setSharedSecrets(decryptedShares);

        } catch (error) {
            console.error("Erro ao carregar dados do cofre", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (encryptionKey && session) {
            fetchData(encryptionKey, session.token);
        }
    }, [encryptionKey, session, fetchData]);

    const getGroupKey = async (groupId, token) => {
        if (groupKeys[groupId]) return groupKeys[groupId];
        try {
            const { data: myKeyData } = await axios.get(`http://localhost:3001/api/groups/${groupId}/mykey`, { headers: { Authorization: `Bearer ${token}` } });
            const decryptor = new JSEncrypt();
            decryptor.setPrivateKey(session.privateKey);
            const groupKey = decryptor.decrypt(myKeyData.encrypted_group_key);
            if (groupKey) {
                setGroupKeys(prev => ({ ...prev, [groupId]: groupKey }));
                return groupKey;
            }
            return null;
        } catch (error) {
            console.error("Não foi possível obter a chave do grupo:", error);
            return null;
        }
    };
    
    const handleDialogClose = () => {
        setOpenDialog(null);
        setFormData({});
        setSecretToShare(null);
    };

    const handleFormChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCreateFolder = async () => {
        if (!encryptionKey || !formData.folderName) return;
        try {
            const iv = CryptoJS.lib.WordArray.random(128 / 8);
            const encrypted_name = CryptoJS.AES.encrypt(formData.folderName, encryptionKey, { iv }).toString();
            await axios.post('http://localhost:3001/api/folders', { encrypted_name, iv: iv.toString(CryptoJS.enc.Hex) }, { headers: { Authorization: `Bearer ${session.token}` } });
            fetchData(encryptionKey, session.token);
            handleDialogClose();
        } catch (error) { console.error('Erro ao criar pasta:', error); }
    };

    const handleCreateGroup = async () => {
        if (!session || !formData.groupName) return;
        try {
            const groupKey = CryptoJS.lib.WordArray.random(256 / 8).toString(CryptoJS.enc.Hex);
            const encryptor = new JSEncrypt();
            encryptor.setPublicKey(session.user.public_key);
            const encrypted_group_key = encryptor.encrypt(groupKey);
            if (!encrypted_group_key) throw new Error("Falha ao criptografar a chave do grupo.");
            await axios.post('http://localhost:3001/api/groups', { name: formData.groupName, encrypted_group_key }, { headers: { Authorization: `Bearer ${session.token}` } });
            fetchData(encryptionKey, session.token);
            handleDialogClose();
        } catch (error) { console.error('Erro ao criar grupo:', error); }
    };

    const handleCreateSecret = async (e) => {
        e.preventDefault();
        if (!encryptionKey) return;
        try {
            const iv = CryptoJS.lib.WordArray.random(128 / 8);
            const encryptedData = {
                encrypted_title: CryptoJS.AES.encrypt(formData.title || '', encryptionKey, { iv }).toString(),
                encrypted_username: CryptoJS.AES.encrypt(formData.username || '', encryptionKey, { iv }).toString(),
                encrypted_password: CryptoJS.AES.encrypt(formData.password || '', encryptionKey, { iv }).toString(),
                folder_id: formData.folder_id || null,
                iv: iv.toString(CryptoJS.enc.Hex)
            };
            await axios.post('http://localhost:3001/api/secrets', encryptedData, { headers: { Authorization: `Bearer ${session.token}` } });
            setFormData({});
            fetchData(encryptionKey, session.token);
        } catch (error) { console.error('Erro ao criar segredo:', error); }
    };
    
    const handleInviteUser = async () => {
        if (!formData.inviteEmail || !selectedGroup || !session) return;
        try {
            const { data: targetUser } = await axios.get(`http://localhost:3001/api/users/find?email=${formData.inviteEmail}`, { headers: { Authorization: `Bearer ${session.token}` } });
            const groupKey = await getGroupKey(selectedGroup.id, session.token);
            if (!groupKey) throw new Error("Não foi possível obter a chave do grupo.");
            const encryptor = new JSEncrypt();
            encryptor.setPublicKey(targetUser.public_key);
            const encrypted_group_key_for_target = encryptor.encrypt(groupKey);
            if (!encrypted_group_key_for_target) throw new Error("Falha ao criptografar a chave do grupo para o novo membro.");
            await axios.post(`http://localhost:3001/api/groups/${selectedGroup.id}/members`, { userIdToAdd: targetUser.id, encrypted_group_key: encrypted_group_key_for_target }, { headers: { Authorization: `Bearer ${session.token}` } });
            alert(`Usuário ${formData.inviteEmail} convidado com sucesso!`);
            handleDialogClose();
        } catch (error) {
            console.error('Erro ao convidar usuário:', error);
            alert(error.response?.data?.message || 'Falha ao convidar usuário.');
        }
    };
    
    const handleShareSecret = async () => {
        if (!secretToShare || !formData.groupId || !session || !encryptionKey) return;
        try {
            const fullSecretResponse = await axios.get(`http://localhost:3001/api/secrets/${secretToShare.id}`, { headers: { Authorization: `Bearer ${session.token}` } });
            const { encrypted_password, iv: secretIv } = fullSecretResponse.data;
            const decryptedPassword = CryptoJS.AES.decrypt(encrypted_password, encryptionKey, { iv: CryptoJS.enc.Hex.parse(secretIv) }).toString(CryptoJS.enc.Utf8);
            const originalData = { title: secretToShare.title, username: secretToShare.username, password: decryptedPassword };
            const groupKey = await getGroupKey(formData.groupId, session.token);
            if (!groupKey) throw new Error("Não foi possível obter a chave do grupo.");
            const iv = CryptoJS.lib.WordArray.random(128 / 8);
            const encrypted_data = CryptoJS.AES.encrypt(JSON.stringify(originalData), groupKey, { iv }).toString();
            await axios.post('http://localhost:3001/api/shares', { original_secret_id: secretToShare.id, group_id: formData.groupId, encrypted_data, iv: iv.toString(CryptoJS.enc.Hex) }, { headers: { Authorization: `Bearer ${session.token}` } });
            alert("Segredo compartilhado com sucesso!");
            fetchData(encryptionKey, session.token);
            handleDialogClose();
        } catch (error) {
            console.error("Erro ao compartilhar segredo:", error);
            alert(error.response?.data?.message || "Falha ao compartilhar o segredo.");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('app_token');
        sessionStorage.removeItem('sessionData');
        navigate('/');
    };

    if (isLoading || !session) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress size={60} /></Box>;
    }
    
    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar><Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>Meu Cofre</Typography><Tooltip title="Sair"><IconButton color="inherit" onClick={handleLogout}><LogoutIcon /></IconButton></Tooltip></Toolbar>
            </AppBar>
            <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}>
                <Toolbar />
                <Box sx={{ overflow: 'auto', p: 2 }}>
                    <Typography variant="h6">Pastas</Typography>
                    <List>{folders.map(f => (<ListItem key={f.id} disablePadding><ListItemButton><ListItemIcon><FolderIcon /></ListItemIcon><ListItemText primary={f.name} /></ListItemButton></ListItem>))}</List>
                    <ListItemButton onClick={() => setOpenDialog('folder')}><ListItemIcon><AddCircleIcon /></ListItemIcon><ListItemText primary="Criar Pasta" /></ListItemButton>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6">Grupos</Typography>
                    <List>{groups.map(g => (<ListItem key={g.id} disablePadding><ListItemButton selected={selectedGroup?.id === g.id} onClick={() => setSelectedGroup(g)}><ListItemIcon><GroupIcon /></ListItemIcon><ListItemText primary={g.name} /></ListItemButton></ListItem>))}</List>
                    <ListItemButton onClick={() => setOpenDialog('group')}><ListItemIcon><AddCircleIcon /></ListItemIcon><ListItemText primary="Criar Grupo" /></ListItemButton>
                </Box>
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#f4f6f8', height: '100vh', overflow: 'auto' }}>
                <Toolbar />
                <Grid container spacing={3}>
                    <Grid item xs={12}><Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} component="form" onSubmit={handleCreateSecret}>
                        <Typography variant="h6">Adicionar Nova Senha</Typography>
                        <TextField name="title" label="Título" variant="outlined" size="small" onChange={handleFormChange} value={formData.title || ''}/>
                        <TextField name="username" label="Usuário" variant="outlined" size="small" onChange={handleFormChange} value={formData.username || ''}/>
                        <TextField name="password" label="Senha" type="password" variant="outlined" size="small" onChange={handleFormChange} value={formData.password || ''}/>
                        <FormControl size="small"><InputLabel>Pasta</InputLabel><Select name="folder_id" label="Pasta" value={formData.folder_id || ''} onChange={handleFormChange}>{folders.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}</Select></FormControl>
                        <Button type="submit" variant="contained">Salvar</Button>
                    </Paper></Grid>
                    <Grid item xs={12} md={8}><Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6">Minhas Senhas</Typography>
                        <List>{secrets.map(s => <ListItem key={s.id} secondaryAction={<Tooltip title="Compartilhar"><IconButton onClick={() => { setSecretToShare(s); setOpenDialog('share');}}><ShareIcon /></IconButton></Tooltip>}><VpnKeyIcon sx={{mr: 1, color: 'text.secondary'}}/><ListItemText primary={s.title} secondary={`Usuário: ${s.username}`} /></ListItem>)}</List>
                    </Paper></Grid>
                     <Grid item xs={12} md={4}><Paper sx={{ p: 2, height: '100%' }}>
                        {selectedGroup ? (<>
                            <Typography variant="h6">Grupo: {selectedGroup.name}</Typography>
                            {selectedGroup.owner_id === session.user.id && <Box component="form" onSubmit={(e) => {e.preventDefault(); handleInviteUser();}}><Typography sx={{mt:2}}>Convidar Membro</Typography><TextField name="inviteEmail" label="Email do usuário" fullWidth size="small" margin="normal" onChange={handleFormChange}/><Button type="submit" variant="outlined">Convidar</Button></Box>}
                        </>) : <Typography>Selecione um grupo</Typography>}
                    </Paper></Grid>
                    <Grid item xs={12}><Paper sx={{ p: 2 }}>
                        <Typography variant="h6">Compartilhados Comigo</Typography>
                        <List>{sharedSecrets.map(s=><ListItem key={s.id}><VpnKeyIcon sx={{mr: 1, color: 'text.secondary'}}/><ListItemText primary={s.data.title} secondary={`Usuário: ${s.data.username} | No grupo: ${groups.find(g => g.id === s.group_id)?.name}`} /></ListItem>)}</List>
                    </Paper></Grid>
                </Grid>
            </Box>
            <Dialog open={openDialog === 'folder'} onClose={handleDialogClose}><DialogTitle>Criar Nova Pasta</DialogTitle><DialogContent><TextField autoFocus margin="dense" name="folderName" label="Nome da Pasta" type="text" fullWidth variant="standard" onChange={handleFormChange}/></DialogContent><DialogActions><Button onClick={handleDialogClose}>Cancelar</Button><Button onClick={handleCreateFolder}>Criar</Button></DialogActions></Dialog>
            <Dialog open={openDialog === 'group'} onClose={handleDialogClose}><DialogTitle>Criar Novo Grupo</DialogTitle><DialogContent><TextField autoFocus margin="dense" name="groupName" label="Nome do Grupo" type="text" fullWidth variant="standard" onChange={handleFormChange}/></DialogContent><DialogActions><Button onClick={handleDialogClose}>Cancelar</Button><Button onClick={handleCreateGroup}>Criar</Button></DialogActions></Dialog>
            <Dialog open={openDialog === 'share'} onClose={handleDialogClose}><DialogTitle>Compartilhar "{secretToShare?.title}"</DialogTitle><DialogContent><DialogContentText>Selecione o grupo com o qual deseja compartilhar este segredo.</DialogContentText><FormControl fullWidth sx={{mt:2}}><InputLabel>Grupo</InputLabel><Select name="groupId" label="Grupo" value={formData.groupId || ''} onChange={handleFormChange}>{groups.filter(g=>g.owner_id === session.user.id).map(g=><MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}</Select></FormControl></DialogContent><DialogActions><Button onClick={handleDialogClose}>Cancelar</Button><Button onClick={handleShareSecret}>Compartilhar</Button></DialogActions></Dialog>
        </Box>
    );
};

export default VaultPage;