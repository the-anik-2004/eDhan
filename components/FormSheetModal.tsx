import { View, Text, Modal, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native'
import React from 'react'

export default function FormSheetModal({visible,title,onClose,children}:{
    visible:boolean;
    title:string;
    onClose:()=>void;
    children:React.ReactNode;
}) {
  return (
    <Modal
        visible={visible}
        animationType="slide" transparent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS==="ios" ? "padding" : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="bg-zinc-100 rounded-t-2x1 px-5 pt-5 pb-8">
            <Text className="text-black text-base font-semibold mb-4">
                {title}
            </Text>
            {children}
            <TouchableOpacity
                onPress={onClose} 
                className="py-2 items-center"
            >
                <Text className="text-zinc-400 text-sm">Cancel</Text>
            </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </Modal>
  )
}