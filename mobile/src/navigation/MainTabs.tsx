import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import InboxScreen from '../screens/InboxScreen';
import FoldersScreen from '../screens/FoldersScreen';
import ComposeScreen from '../screens/ComposeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors } from '../lib/colors';

const Tab = createBottomTabNavigator();

type IoniconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Inbox:    { active: 'mail',          inactive: 'mail-outline'     },
  Folders:  { active: 'folder',        inactive: 'folder-outline'   },
  Compose:  { active: 'create',        inactive: 'create-outline'   },
  Settings: { active: 'settings',      inactive: 'settings-outline' },
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused, size }) => {
          const icons = TAB_ICONS[route.name];
          const name = focused ? icons?.active : icons?.inactive;
          return (
            <View style={styles.iconWrap}>
              {focused && <View style={styles.activeIndicator} />}
              <Ionicons name={name ?? 'ellipse-outline'} size={24} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Folders" component={FoldersScreen} />
      <Tab.Screen
        name="Compose"
        component={ComposeScreen}
        listeners={({ navigation }) => ({
          tabPress: e => {
            e.preventDefault();
            navigation.navigate('Compose', {});
          },
        })}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bgCard,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 82,
    paddingBottom: 24,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  iconWrap: {
    alignItems: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -10,
    width: 36,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
