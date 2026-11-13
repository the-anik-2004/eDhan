import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
  return (
    <SafeAreaView
    className="flex-1 bg-red" edges={["top"]}
    >
      <Text className="text-black">Onboarding Screen</Text>
    </SafeAreaView>
  )
}