import { useAuth, useUser } from '@clerk/expo';
import { router, useRouter } from 'expo-router';
import { Text, TouchableOpacity, Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const {user} =useUser();
  const {signOut} =useAuth();
  const router = useRouter() 

  const handleSignOut=()=>{
    Alert.alert("Sign out","Are you sure you want ti sign out?",[
      {text:"Cancel",style:"cancel"},
      {
        text:"Sign out",
        style:"destructive",
        onPress:async ()=>{
          await signOut();
          router.replace("/sign-in")
        }
      }
    ])
  }

  return (
    <SafeAreaView
    className="flex-1 bg-white" edges={["top"]}
    >
      <TouchableOpacity>
          <Text onPress={()=>signOut()}>
            Log out
          </Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}