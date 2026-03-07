/**
 * Hook personnalisé pour la gestion vocale d'Adria (STT + TTS)
 */
import { useState, useRef, useCallback } from 'react';

const useAdriaVoice = ({ toast, onTranscription }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
      });
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (audioChunksRef.current.length === 0) {
          toast({ title: 'Erreur', description: 'Aucune donnée audio enregistrée', variant: 'destructive' });
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 1000) {
          toast({ title: 'Enregistrement trop court', description: 'Veuillez parler plus longtemps', variant: 'destructive' });
          return;
        }
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      toast({ title: 'Enregistrement', description: 'Parlez maintenant...' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.name === 'NotAllowedError'
          ? 'Accès au microphone refusé.'
          : 'Impossible d\'accéder au microphone.',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const transcribeAudio = async (audioBlob) => {
    try {
      const formData = new FormData();
      const extension = audioBlob.type.includes('webm') ? 'webm' :
        audioBlob.type.includes('mp4') ? 'mp4' :
          audioBlob.type.includes('ogg') ? 'ogg' : 'wav';
      formData.append('audio', audioBlob, `recording.${extension}`);

      const token = localStorage.getItem('token');
      if (!token) throw new Error('Non authentifié');

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || ''}/api/ai/voice/transcribe`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`);

      const data = await response.json();
      if (data.success && data.transcription) {
        toast({ title: 'Transcription réussie', description: data.transcription.substring(0, 50) + '...' });
        onTranscription(data.transcription);
      } else {
        toast({ title: 'Erreur transcription', description: 'Impossible de transcrire l\'audio.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Erreur', description: `Erreur transcription: ${error.message}`, variant: 'destructive' });
    }
  };

  const speakText = useCallback(async (text) => {
    if (!isTTSEnabled || !text) return;
    try {
      setIsPlayingAudio(true);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || ''}/api/ai/voice/tts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.replace(/\[\[.*?\]\]/g, '').trim(), voice: 'nova' })
      });
      const data = await response.json();
      if (data.success && data.audio_base64) {
        const audioData = atob(data.audio_base64);
        const view = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) view[i] = audioData.charCodeAt(i);
        const audioBlob = new Blob([view.buffer], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioPlayerRef.current) audioPlayerRef.current.pause();
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;
        audio.onended = () => { setIsPlayingAudio(false); URL.revokeObjectURL(audioUrl); };
        audio.onerror = () => { setIsPlayingAudio(false); };
        await audio.play();
      }
    } catch (error) {
      console.error('Erreur TTS:', error);
      setIsPlayingAudio(false);
    }
  }, [isTTSEnabled]);

  const stopAudio = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlayingAudio(false);
    }
  }, []);

  return {
    isRecording, isTTSEnabled, isPlayingAudio,
    setIsTTSEnabled, startRecording, stopRecording, speakText, stopAudio
  };
};

export default useAdriaVoice;
