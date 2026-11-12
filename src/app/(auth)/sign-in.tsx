import { useSignIn } from '@clerk/expo';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { CodeFormValues, codeSchema, SignInFormValues, signInSchema } from '../../../lib/schema/auth.schema';

export default function SignInScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const isLoading = fetchStatus === 'fetching';

  const {
    control,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  const {
    control: codeControl,
    handleSubmit: handleCodeSubmit,
    formState: { errors: codeFormErrors },
  } = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    mode: 'onBlur',
    defaultValues: { code: '' },
  });

  const onSignInPress = async (values: SignInFormValues) => {
    const { error } = await signIn.create({
      identifier: values.email,
      password: values.password,
    });

    if (error) {
      console.error('Sign-in failed:', error);
      return;
    }

    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl('/');
          router.replace(url as any);
        },
      });
      return;
    }

    if (signIn.status === 'needs_second_factor') {
      const codeFactor = signIn.supportedSecondFactors?.find(
        (factor) => factor.strategy === 'email_code' || factor.strategy === 'phone_code',
      );

      if (codeFactor?.strategy === 'email_code') {
        await signIn.mfa.sendEmailCode();
      } else if (codeFactor?.strategy === 'phone_code') {
        await signIn.mfa.sendPhoneCode();
      }
      return;
    }

    if (signIn.status === 'needs_client_trust') {
      const emailCodeFactor = signIn.supportedSecondFactors?.find(
        (factor) => factor.strategy === 'email_code',
      );

      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode();
      }
    }
  };

  const onVerifyPress = async ({ code }: CodeFormValues) => {
    const { error } = await signIn.mfa.verifyEmailCode({ code });

    if (error) {
      console.error('Verification failed:', error);
      return;
    }

    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl('/');
          router.replace(url as any);
        },
      });
      return;
    }

    console.error('Sign-in attempt not complete:', signIn);
  };

  const onResendCode = async () => {
    const emailCodeFactor = signIn.supportedSecondFactors?.find(
      (factor) => factor.strategy === 'email_code',
    );

    if (emailCodeFactor) {
      const { error } = await signIn.mfa.sendEmailCode();
      if (error) {
        console.error('Could not resend code:', error);
      }
    }
  };

  if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 ">
        <View className="flex-1 justify-center items-stretch px-6 -mt-16 ">
          <Image
            source={require('../../../assets/images/edl.png')}
            className="w-36 h-16 mb-8"
            resizeMode="contain"
          />
          <Text className="text-left text-3xl font-bold text-[#1A1D26] mb-2 leading-tight">Verify your sign in</Text>
          <Text className="text-left text-base text-gray-600 mb-2 leading-tight">
            Enter the code sent to your email or phone.
          </Text>

          <Controller
            control={codeControl}
            name="code"
            render={({ field: { value, onChange } }) => (
              <TextInput
                className="w-full text-left border border-[#E8E6DF] bg-white rounded-xl px-4 py-3 text-[#1A1D26] "
                placeholder="Verification code"
                placeholderTextColor="#8A8D96"
                value={value}
                onChangeText={onChange}
                keyboardType="number-pad"
                autoCapitalize="none"
              />
            )}
          />

          {codeFormErrors.code && (
            <Text className="text-coral-600 mb-4 text-sm">{codeFormErrors.code.message}</Text>
          )}

          <TouchableOpacity
            onPress={() => {
              void handleCodeSubmit(onVerifyPress)();
            }}
            disabled={isLoading}
            className="w-full bg-[#1D4E5B] py-4 rounded-xl items-center mb-3"
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-xl">Verify code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              void onResendCode();
            }}
            disabled={isLoading}
            className="w-full rounded-xl items-center mb-1"
          >
            <Text className="text-blue-500 underline">Resend code</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
      <View className="flex-1 justify-center items-stretch px-6 -mt-16">
        <Image
          source={require('../../../assets/images/edl.png')}
          className="w-36 h-16 mb-8"
          resizeMode="contain"
        />
        <Text className="text-left text-3xl font-bold text-[#1A1D26] mb-2 leading-tight">Welcome back</Text>
        <Text className="text-left text-base text-gray-600 mb-2 leading-tight">Track your money, powered by AI</Text>

        <View className="gap-3">
          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange } }) => (
              <TextInput
                className="w-full text-left border border-[#E8E6DF] bg-white rounded-xl px-4 py-3 text-[#1A1D26]"
                placeholder="Email"
                placeholderTextColor="#8A8D96"
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            )}
          />
          {formErrors.email && (
            <Text className="text-coral-600 text-sm">{formErrors.email.message}</Text>
          )}

          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange } }) => (
              <TextInput
                className="w-full text-left border border-[#E8E6DF] bg-white rounded-xl px-4 py-3 text-[#1A1D26]"
                placeholder="Password"
                placeholderTextColor="#8A8D96"
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                secureTextEntry
              />
            )}
          />
          {formErrors.password && (
            <Text className="text-coral-600 text-sm">{formErrors.password.message}</Text>
          )}

          <TouchableOpacity
            onPress={() => {
              void handleSubmit(onSignInPress)();
            }}
            disabled={isLoading}
            className="w-full bg-[#1D4E5B] py-4 rounded-xl items-center"
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-xl">Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-3">
          <Text className="text-gray-500 font-semibold">Don't have an account?</Text>
          <Link href="/sign-up">
            <Text className="text-blue-500 underline underline-offset-4">Sign Up</Text>
          </Link>
        </View>
      </View>

      <View nativeID="clerk-captcha" />
    </KeyboardAvoidingView>
  );
}