import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import './global.css';

export default function App() {
  return (
    <View className="flex-1 bg-white items-center justify-center">
      <Text className="text-lg font-semibold">Welcome to Planityy!</Text>
      <StatusBar style="auto" />
    </View>
  );
}
