import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingProvider } from './OnboardingContext';
import { WelcomeStep } from './steps/WelcomeStep';
import { SubjectsStep } from './steps/SubjectsStep';
import { StrugglesStep } from './steps/StrugglesStep';
import { GoalStep } from './steps/GoalStep';
import { FrequencyStep } from './steps/FrequencyStep';
import { SocialProofStep } from './steps/SocialProofStep';
import { BuildingPlanStep } from './steps/BuildingPlanStep';
import { PlanReadyStep } from './steps/PlanReadyStep';
import { SaveProgressStep } from './steps/SaveProgressStep';
import { PaywallStep } from './steps/PaywallStep';

const Stack = createNativeStackNavigator();

export function OnboardingFlow() {
  return (
    <OnboardingProvider>
      <Stack.Navigator
        initialRouteName="OB_Welcome"
        screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: false }}
      >
        <Stack.Screen name="OB_Welcome" component={WelcomeStep} />
        <Stack.Screen name="OB_Subjects" component={SubjectsStep} />
        <Stack.Screen name="OB_Struggles" component={StrugglesStep} />
        <Stack.Screen name="OB_Goal" component={GoalStep} />
        <Stack.Screen name="OB_Frequency" component={FrequencyStep} />
        <Stack.Screen name="OB_SocialProof" component={SocialProofStep} />
        <Stack.Screen name="OB_BuildingPlan" component={BuildingPlanStep} />
        <Stack.Screen name="OB_PlanReady" component={PlanReadyStep} />
        <Stack.Screen name="OB_SaveProgress" component={SaveProgressStep} />
        <Stack.Screen name="OB_Paywall" component={PaywallStep} />
      </Stack.Navigator>
    </OnboardingProvider>
  );
}
