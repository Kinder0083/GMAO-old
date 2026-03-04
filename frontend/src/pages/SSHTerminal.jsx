import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Terminal as TerminalIcon, AlertTriangle, Wifi, WifiOff, Lock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

function SSHTerminal() {
  const { toast } = useToast();
  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | connected
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('');
  const termRef = useRef(null);
  const termContainerRef = useRef(null);
  const wsRef = useRef(null);
  const fitAddonRef = useRef(null);

  // Charger xterm.js dynamiquement
  const initTerminal = useCallback(async () => {
    if (termRef.current) return;

    const { Terminal } = await import('@xterm/xterm');
    const { FitAddon } = await import('@xterm/addon-fit');
    const { WebLinksAddon } = await import('@xterm/addon-web-links');

    // Importer le CSS xterm
    await import('@xterm/xterm/css/xterm.css');

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace',
      theme: {
        background: '#1a1b26',
        foreground: '#c0caf5',
        cursor: '#c0caf5',
        selectionBackground: '#33467c',
        black: '#15161e',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5',
      },
      scrollback: 5000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    if (termContainerRef.current) {
      term.open(termContainerRef.current);
      fitAddon.fit();
    }

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[1;34m=== FSAO Iris - Terminal SSH ===\x1b[0m');
    term.writeln('\x1b[90mEntrez vos identifiants SSH et cliquez sur Connecter.\x1b[0m');
    term.writeln('');
  }, []);

  useEffect(() => {
    initTerminal();

    const handleResize = () => {
      if (fitAddonRef.current) {
        try { fitAddonRef.current.fit(); } catch {}
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
    };
  }, [initTerminal]);

  const connect = useCallback(() => {
    if (!password) {
      toast({ title: 'Erreur', description: 'Veuillez saisir le mot de passe SSH', variant: 'destructive' });
      return;
    }

    const term = termRef.current;
    if (!term) return;

    setStatus('connecting');
    term.writeln(`\x1b[33mConnexion à ${username}@${host}:${port}...\x1b[0m`);

    // Construire l'URL WebSocket
    const wsProtocol = BACKEND_URL.startsWith('https') ? 'wss' : 'ws';
    const wsHost = BACKEND_URL.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${wsHost}/api/ssh/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      // Envoyer le message d'authentification
      const token = localStorage.getItem('token');
      ws.send(JSON.stringify({
        type: 'auth',
        token,
        host,
        port: parseInt(port),
        username,
        password,
      }));
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Données binaires du terminal SSH
        const text = new TextDecoder().decode(event.data);
        term.write(text);
      } else {
        // Message JSON (statut, erreur)
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'connected') {
            setStatus('connected');
            term.writeln(`\x1b[32m${msg.data}\x1b[0m`);
            term.writeln('');

            // Envoyer la taille du terminal
            const dims = fitAddonRef.current?.proposeDimensions();
            if (dims) {
              ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
            }
          } else if (msg.type === 'error') {
            setStatus('disconnected');
            term.writeln(`\x1b[31mErreur: ${msg.data}\x1b[0m`);
          }
        } catch {
          term.write(event.data);
        }
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      term.writeln('');
      term.writeln('\x1b[33mConnexion fermée.\x1b[0m');
    };

    ws.onerror = () => {
      setStatus('disconnected');
      term.writeln('\x1b[31mErreur de connexion WebSocket.\x1b[0m');
    };

    // Envoyer les données clavier au WebSocket
    const dataHandler = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(new TextEncoder().encode(data));
      }
    });

    // Gérer le redimensionnement
    const resizeHandler = term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    // Cleanup on disconnect
    ws.addEventListener('close', () => {
      dataHandler.dispose();
      resizeHandler.dispose();
    });
  }, [host, port, username, password, toast]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div className="space-y-4 p-6" data-testid="ssh-terminal-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TerminalIcon className="h-6 w-6" />
            Terminal SSH
          </h1>
          <p className="text-sm text-gray-500">Console interactive du container LXC</p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <Wifi size={16} />
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Connecté
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              <WifiOff size={16} />
              Déconnecté
            </span>
          )}
        </div>
      </div>

      <Alert variant="destructive" className="py-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>ATTENTION :</strong> Accès direct au système. Commandes interactives supportées (vim, top, htop...).
        </AlertDescription>
      </Alert>

      {/* Connexion */}
      {!isConnected && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock size={16} />
              Identifiants SSH
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Hôte</label>
                <Input
                  value={host} onChange={e => setHost(e.target.value)}
                  placeholder="localhost" disabled={isConnecting}
                  data-testid="ssh-host"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Port</label>
                <Input
                  value={port} onChange={e => setPort(e.target.value)}
                  placeholder="22" disabled={isConnecting}
                  data-testid="ssh-port"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Utilisateur</label>
                <Input
                  value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="root" disabled={isConnecting}
                  data-testid="ssh-username"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Mot de passe</label>
                <Input
                  type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mot de passe SSH"
                  disabled={isConnecting}
                  onKeyDown={e => e.key === 'Enter' && connect()}
                  data-testid="ssh-password"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button onClick={connect} disabled={isConnecting || !password}
                data-testid="ssh-connect-btn"
              >
                {isConnecting ? 'Connexion...' : 'Connecter'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bouton déconnexion quand connecté */}
      {isConnected && (
        <div className="flex justify-end">
          <Button variant="destructive" size="sm" onClick={disconnect}
            data-testid="ssh-disconnect-btn"
          >
            Déconnecter
          </Button>
        </div>
      )}

      {/* Terminal xterm.js */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div
            ref={termContainerRef}
            data-testid="ssh-terminal-container"
            style={{
              height: isConnected ? '70vh' : '300px',
              background: '#1a1b26',
              padding: '8px',
              transition: 'height 0.3s ease',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default SSHTerminal;
