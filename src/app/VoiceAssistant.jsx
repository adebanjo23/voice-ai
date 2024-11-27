'use client';

import { useState, useReducer, useRef, useLayoutEffect } from 'react';
import Image from 'next/image';
import conversationReducer from './conversationReducer';
import { UserInfoForm } from './UserInfoForm';
import logo from 'public/logo.svg';
import micIcon from 'public/mic.svg';
import micOffIcon from 'public/mic-off.svg';

const initialConversation = { messages: [], finalTranscripts: [], interimTranscript: '' };

const defaultUserInfo = {
  name: "",
  age: "",
  gender: "unknown",
  family_details: "",
  interests: "",
  gift_wishes: ""
};

function VoiceAssistant() {
  const [conversation, dispatch] = useReducer(conversationReducer, initialConversation);
  const [isRunning, setIsRunning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userInfo, setUserInfo] = useState(defaultUserInfo);
  const [formError, setFormError] = useState("");

  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const audioElementRef = useRef(null);
  const backgroundAudioRef = useRef(null);
  const audioDataRef = useRef([]);
  const messagesEndRef = useRef(null);

  // Initialize background audio
  useLayoutEffect(() => {
    backgroundAudioRef.current = new Audio('/background-audio.mp3');
    backgroundAudioRef.current.loop = true;
    backgroundAudioRef.current.volume = 0.6;

    return () => {
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
        backgroundAudioRef.current = null;
      }
    };
  }, []);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation]);

  function validateUserInfo() {
    if (!userInfo.name.trim()) {
      setFormError("Please tell Santa your name!");
      return false;
    }
    if (!userInfo.age.trim()) {
      setFormError("Please tell Santa your age!");
      return false;
    }
    if (userInfo.gender === "unknown") {
      setFormError("Please select your gender!");
      return false;
    }
    setFormError("");
    return true;
  }

  function openWebSocketConnection() {
    const ws_url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://4474-41-217-206-254.ngrok-free.app/listen';
    wsRef.current = new WebSocket(ws_url);
    wsRef.current.binaryType = 'arraybuffer';

    wsRef.current.onopen = () => {
      // Send user information as soon as connection is established
      wsRef.current.send(JSON.stringify(userInfo));
    };

    function handleAudioStream(streamData) {
      audioDataRef.current.push(new Uint8Array(streamData));
      if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
        sourceBufferRef.current.appendBuffer(audioDataRef.current.shift());
      }
    }

    function handleJsonMessage(jsonData) {
      const message = JSON.parse(jsonData);
      if (message.type === 'finish') {
        endConversation();
      } else {
        if (message.type === 'transcript_final' && isAudioPlaying()) {
          skipCurrentAudio();
        }
        dispatch(message);
      }
    }

    wsRef.current.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        handleAudioStream(event.data);
      } else {
        handleJsonMessage(event.data);
      }
    };

    wsRef.current.onclose = () => {
      endConversation();
    }
  }

  function closeWebSocketConnection() {
    if (wsRef.current) {
      wsRef.current.close();
    }
  }

  async function startMicrophone() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    mediaRecorderRef.current.addEventListener('dataavailable', e => {
      if (e.data.size > 0 && wsRef.current.readyState == WebSocket.OPEN) {
        wsRef.current.send(e.data);
      }
    });
    mediaRecorderRef.current.start(250);
  }

  function stopMicrophone() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  }

  function startAudioPlayer() {
    // Start background music
    if (backgroundAudioRef.current) {
        backgroundAudioRef.current.play().catch(err => {
            console.log('Error playing background audio:', err);
        });
    }

    let mediaSource = new MediaSource();
    audioElementRef.current = new Audio();
    audioElementRef.current.src = URL.createObjectURL(mediaSource);

    let sourceBuffer;
    let audioQueue = [];
    let isInitialized = false;

    mediaSource.addEventListener('sourceopen', () => {
        sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');

        sourceBuffer.addEventListener('updateend', () => {
            if (audioQueue.length > 0 && !sourceBuffer.updating) {
                sourceBuffer.appendBuffer(audioQueue.shift());
            }
        });

        isInitialized = true;
    });

    wsRef.current.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
            const audioData = new Uint8Array(event.data);

            if (!isInitialized) {
                audioQueue.push(audioData);
                return;
            }

            if (sourceBuffer.updating || audioQueue.length > 0) {
                audioQueue.push(audioData);
            } else {
                sourceBuffer.appendBuffer(audioData);
            }

            if (!audioElementRef.current.playing) {
                audioElementRef.current.play().catch(console.error);
                // Lower background music volume while TTS plays
                if (backgroundAudioRef.current) {
                    backgroundAudioRef.current.volume = 0.15;
                }
            }
        } else {
            const message = JSON.parse(event.data);
            if (message.type === 'finish') {
                endConversation();
            } else if (message.type === 'audio_end') {
                // Restore background music volume when TTS ends
                if (backgroundAudioRef.current) {
                    backgroundAudioRef.current.volume = 0.3;
                }
            } else {
                if (message.type === 'transcript_final' && isAudioPlaying()) {
                    skipCurrentAudio();
                }
                dispatch(message);
            }
        }
    };
}

  function isAudioPlaying() {
    return audioElementRef.current?.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA;
  }

  function skipCurrentAudio() {
    audioDataRef.current = [];
    const buffered = sourceBufferRef.current.buffered;
    if (buffered.length > 0) {
      if (sourceBufferRef.current.updating) {
        sourceBufferRef.current.abort();
      }
      audioElementRef.current.currentTime = buffered.end(buffered.length - 1);
    }
  }

  function stopAudioPlayer() {
    // Stop background music
    if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
        backgroundAudioRef.current.currentTime = 0;
    }

    if (audioElementRef.current) {
        audioElementRef.current.pause();
        if (audioElementRef.current.src) {
            URL.revokeObjectURL(audioElementRef.current.src);
        }
        audioElementRef.current = null;
    }
}

  async function startConversation() {
    if (!validateUserInfo()) {
      return;
    }

    dispatch({ type: 'reset' });
    try {
      openWebSocketConnection();
      await startMicrophone();
      startAudioPlayer();
      setIsRunning(true);
      setIsListening(true);
    } catch (err) {
      console.log('Error starting conversation:', err);
      endConversation();
    }
  }

  function endConversation() {
    closeWebSocketConnection();
    stopMicrophone();
    stopAudioPlayer();
    setIsRunning(false);
    setIsListening(false);
  }

  function toggleListening() {
    if (isListening) {
      mediaRecorderRef.current.pause();
    } else {
      mediaRecorderRef.current.resume();
    }
    setIsListening(!isListening);
  }

  const currentTranscript = [...conversation.finalTranscripts, conversation.interimTranscript].join(' ');

  return (
    <div className='w-full max-w-3xl mx-auto px-4'>
      <div className='sticky top-0 bg-white'>
        <header className='flex flex-col gap-0.5 pt-4'>
          <a href='https://codeawake.com'>
            <Image src={logo} width={128} alt='logo' />
          </a>
          <h1 className='font-urbanist text-[1.65rem] font-semibold'>Santa&apos;s Voice Assistant</h1>
        </header>

        {!isRunning && (
          <div className="my-6 p-6 bg-white rounded-xl shadow-sm border">
            <UserInfoForm userInfo={userInfo} setUserInfo={setUserInfo} />
            {formError && (
              <p className="text-red-500 text-sm mt-2 text-center">{formError}</p>
            )}
          </div>
        )}

        <div className='sticky top-0 flex flex-col justify-center items-center pt-10 pb-4 bg-white'>
          <div className={`wave ${isRunning ? 'running' : ''}`} />
          <p className='mt-12 text-[13px] text-primary-orange'>
            {isRunning
              ? 'You can also end the conversation by saying "bye" or "goodbye"'
              : 'Fill in your details and click here to start talking with Santa!'
            }
          </p>
          <div className='flex items-center mt-3 gap-6'>
            <button
              className='w-48 border border-primary-orange text-primary-orange font-semibold px-4 py-1 rounded-2xl hover:bg-primary-orange/5'
              onClick={isRunning ? endConversation : startConversation}
            >
              {isRunning ? 'End conversation' : 'Start conversation'}
            </button>
            <button
              className='h-9 w-9 flex justify-center items-center bg-primary-orange rounded-full shadow-lg hover:opacity-70 disabled:opacity-70'
              onClick={toggleListening}
              disabled={!isRunning}
            >
              <Image src={isListening ? micIcon : micOffIcon} height={21} width={21} alt='microphone' />
            </button>
          </div>
        </div>
      </div>
      <div className='flex flex-col items-start py-4 rounded-lg space-y-3'>
        {conversation.messages.map(({ role, content }, idx) => (
          <div key={idx} className={role === 'user' ? 'user-bubble' : 'assistant-bubble'}>
            {content}
          </div>
        ))}
        {currentTranscript && (
          <div className='user-bubble'>{currentTranscript}</div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

function getMediaSource() {
  if ('MediaSource' in window) {
    return new MediaSource();
  } else if ('ManagedMediaSource' in window) {
    // Use ManagedMediaSource if available in iPhone
    return new ManagedMediaSource();
  } else {
    console.log('No MediaSource API available');
    return null;
  }
}

export default VoiceAssistant;