import { useAuth } from '@clerk/expo';
import { Redirect, Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import type { AndroidSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { Platform, type ColorValue } from 'react-native';

const useNativeTabs = Platform.OS === 'ios';

export default function TabLayout() {
  const {isSignedIn,isLoaded}=useAuth();

  if(!isLoaded){
    return null;
  }

  if (!isSignedIn){
     return <Redirect href="/sign-in" />;
  }
  if (useNativeTabs) {
    return (
      <NativeTabs
        backgroundColor="#FFFFFF"
        tintColor="#4A9EFF"
        iconColor={{ default: '#5C5F68', selected: '#4A9EFF' }}
        labelStyle={{
          default: { color: '#5C5F68' },
          selected: { color: '#4A9EFF' },
        }}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="transactions">
          <NativeTabs.Trigger.Label>Transactions</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="list.bullet" md="receipt_long" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="add-transaction">
          <NativeTabs.Trigger.Label>Add</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="plus.circle.fill" md="add_circle" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="assistant">
          <NativeTabs.Trigger.Label>Assistant</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="brain.head.profile" md="smart_toy" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  const icon = (name: AndroidSymbol) => {
    return ({ color, size }: { color: ColorValue; size: number }) => (
      <SymbolView name={{ android: name, web: name }} tintColor={color} size={size} />
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4A9EFF',
        tabBarInactiveTintColor: '#5C5F68',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8E6DF',
          paddingTop: 4,
          height: 80,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen
        name="transactions"
        options={{ title: 'Transactions', tabBarIcon: icon('receipt_long') }}
      />
      <Tabs.Screen
        name="add-transaction"
        options={{ title: 'Add', tabBarIcon: icon('add_circle') }}
      />
      <Tabs.Screen
        name="assistant"
        options={{ title: 'Assistant', tabBarIcon: icon('smart_toy') }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
