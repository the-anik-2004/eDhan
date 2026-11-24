import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { AudioQuality, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import { AI_GRADIENT, COLORS, RECORDING_GRADIENT } from '../constants/themes';
import { ExtractedTransaction, extractTransactionFromVoice } from '../lib/services/ai/extractTransaction';
import { File } from 'expo-file-system';
type Status = "idle" | "recording" | "processing" | "error";
const MAX_RECORDING_SECONDS = 30;
const VOICE_RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16_000,
  numberOfChannels: 1,
  bitRate: 32_000,
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    audioQuality: AudioQuality.LOW,
  },
  web: {
    ...RecordingPresets.HIGH_QUALITY.web,
    bitsPerSecond: 32_000,
  },
};


export default function VoiceRecorderModal({visible,onClose,onExtracted}:{
    visible:boolean;
    onClose:()=>void;
    onExtracted:(result:ExtractedTransaction)=>void;
    
}) {

  const recorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
  const[status,setStatus]=useState<Status>("idle")
  const [seconds, setSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState("Couldn't process the recording. Please try again.");

  const stopRecording=useCallback(async()=>{
    setStatus("processing");
    await recorder.stop();

    try{
      const uri =recorder.uri;
      if(!uri) throw new Error("No Recording captured");

      const file = new File(uri);
      const base64 =await file.base64();
      const mimeType = Platform.OS === "web" ? "audio/webm" : "audio/m4a";
      const result = await extractTransactionFromVoice(base64,mimeType);
      onExtracted(result);
      onClose();
    }catch(error){
      console.error("Voice extraction failed:",error);
      setErrorMessage("Couldn't process the recording. Please try again.");
      setStatus("error");
    }
  }, [onClose, onExtracted, recorder]);

  const startRecording=async()=>{
    setSeconds(0);
    await recorder.prepareToRecordAsync();
    recorder.record();
    setStatus("recording");
  }

  useEffect(()=>{
    if(!visible){
      setStatus("idle")
      setSeconds(0);
      return;
    }
    (async ()=> {
      const {granted} =await requestRecordingPermissionsAsync();
      if(!granted){
        setErrorMessage("Microphone permission is required to record a transaction.");
        setStatus("error");
        return;
      }
      await setAudioModeAsync({
        allowsRecording:true,
        playsInSilentMode:true,
      });
    })();
  },[visible])

  useEffect(()=>{
    if(status!=="recording") return;
    const interval =setInterval (()=>setSeconds((s)=>s+1),1000);
    const maxDurationTimer = setTimeout(() => {
      void stopRecording();
    }, MAX_RECORDING_SECONDS * 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(maxDurationTimer);
    };
  }, [status, stopRecording]);
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        className="flex-1 justify-end"
      >
        <BlurView intensity={40} tint="dark" className="absolute inset-0"/>
        <View
          style={{
            width: "100%",
            alignItems: "center",
            overflow: "hidden",
            backgroundColor: "#14162A",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 40,
          }}
        >
          {status === "error" ? 
            <>
              <Feather name="alert-circle" size={32} color="#FF6B4A" />
              <Text className="text-white/60 text-sm mt-3 mb-6 text-center">
              {errorMessage}
              </Text>
              <TouchableOpacity
              onPress={onClose}
              className="bg-white/10 rounded-x1 px-6 py-3.5">
                
              <Text className="text-white text-sm font-semibold">Close</Text>
              </TouchableOpacity>

            </>
            :<>
              <View className="flex-row items-center gap-1.5 mn-1">
                <MaterialCommunityIcons
                  name="robot-outline"
                  size={13}
                  color={COLORS.teal}
                />
                <Text
                  style={{color:COLORS.teal}}
                  className="text-[11px] font-semibold tracking-wide uppercase"
                >AI voice log</Text>
              </View>
              <Text className="text-white text-base font-semibold mb-1">
                {status === "recording"
                 ? "Listening..."
                 :status === "processing"
                  ?"Understanding that ..."
                  :"Tell me about a transaction"
                }
              </Text>
              <Text
                className="text-white/50 text-xs mb-8 text-center px-4 "
              >
                {status==="recording"
                  ? `${Math.floor(seconds/60)}:${String(seconds %60).padStart(2,"0")} / 0:30`
                  : status === "processing"
                  ?"Transcribing and extracting the details"
                  :'"I spent 400 on Groceries yesterday"'
                }
              </Text>
              <View className="w-24 h-24 items-center justify-center mb-8">
                {status === "processing" ? (
                  <ActivityIndicator size="large" color={COLORS.teal}/>
                ):(
                  <TouchableOpacity
                    onPress={
                      status === "recording" ? stopRecording : startRecording
                    }
                    activeOpacity={0.85}
                    className="w-16 h-16 rounded-full items-center justify-center"
                    style={{
                      backgroundColor:
                              status === "recording"
                              ? RECORDING_GRADIENT[0]
                              : AI_GRADIENT[0]
                    }}  
                  >
                    <Feather
                      name={status === "recording" ? "square" : "mic"} 
                      size={24}
                      color="#fff" 
                    />
                  </TouchableOpacity>
                )
              }
              </View>
              <TouchableOpacity
                onPress={onClose}
                disabled={status === "processing"}
              >
            <Text className="text-white/40 text-sm">Cancel</Text>
          </TouchableOpacity>
            </>
          }
        </View>
      </View>
    </Modal>
  )
}