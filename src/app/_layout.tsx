import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Slot } from "expo-router";
import "../../global.css";

function getPublishableKey(): string {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!key) {
    throw new Error(
      "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add it to .env and restart Expo.",
    );
  }

  return key;
}

const publishableKey = getPublishableKey();

export default function RootLayout() {
  return (<ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
                <Slot/>
          </ClerkProvider>);
}










/**
 NB:
 <Stack /> creates a stack navigator. It manages screen history, back navigation, and options like headers and animations.


<Slot /> renders the matched child route inside the layout, without creating a navigator or adding navigation controls itself.
 */