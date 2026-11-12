import { useAuth, useSignUp } from '@clerk/expo';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CodeFormValues, codeSchema, SignUpFormValues, signUpSchema } from '../../../lib/schema/auth.schema';

export default function SignUpScreen() {
  const {signUp,errors,fetchStatus}=useSignUp();

  const [email,setEmail]=useState("");
  const isLoading= fetchStatus ==="fetching";
  const {isSignedIn}=useAuth()

  const {
    control,handleSubmit,
    formState:{errors: formErrors},
  }=useForm<SignUpFormValues>({
    resolver:zodResolver(signUpSchema),
    mode:"onBlur",
    defaultValues:{
      firstName:"",lastName:"",email:"",password:""
    },
  })

  const {
    control:codeControl,
    handleSubmit: handleCodeSubmit,
    formState:{errors:codeFormErrors}
  }=useForm<CodeFormValues>({
    resolver:zodResolver(codeSchema),
    mode:"onBlur",
    defaultValues:{code:""}
  })

  const onSignUpPress = async(values:SignUpFormValues)=>{
      setEmail(values.email)

      const {error}=await signUp.password({
        emailAddress:values.email,
        password:values.password,
        firstName:values.firstName,
        lastName:values.lastName,
      })


      const {error:verificationError}=await signUp.verifications.sendEmailCode();
      if(verificationError){
        console.error('Could not send verification code:', verificationError)
      }
  };

  const onVerifyPress = async ({code}: CodeFormValues)=>{
    const {error}=await signUp.verifications.verifyEmailCode({code});
    if(error){
      console.error('Email verification failed:', error)
      return;
    }

    if(signUp.status === "complete"){
      await signUp.finalize({
        navigate:({session, decorateUrl})=>{
          if(session?.currentTask)return;
          const url = decorateUrl("/");
          router.replace(url as any);
        },
      });
    }else {
      console.error("Sign-up attempt not complete:" ,signUp)
    }
  };

  if(signUp.status ==="complete" || isSignedIn ){
    return null;
  }

  const onResendCode = async()=>{
    const {error}=await signUp.verifications.sendEmailCode();
    if(error){
      console.error('Could not resend verification code:', error)
    }
  };

   if(
      signUp.status ==="missing_requirements" &&
      signUp.unverifiedFields.includes("email_address") &&
      signUp.missingFields.length===0
    ){
      return(
          <KeyboardAvoidingView
            behavior={Platform.OS==="ios"?"padding":"height"}
            className="flex-1 "
          >
            <View 
              className="flex-1 justify-center items-stretch px-6 -mt-16 gap-2"
            >
              <Image 
                  source={require("../../../assets/images/edl.png")}
                  className="w-36 h-16 mb-8 "
                  resizeMode="contain"
              />
              <Text className="text-left text-3xl font-bold text-[#1A1D26] mb-2 leading-tight">Verify your account</Text>
              <Text className="text-left text-base text-gray-600 mb-2 leading-tight">
                We sent a code to {email || signUp.emailAddress}
              </Text>
               
               <Controller
                control={codeControl}
                name="code"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    className="w-full text-left border border-[#E8E6DF] bg-white rounded-xl px-4 py-3 text-[#1A1D26]"
                    placeholder="Verification code"
                    placeholderTextColor="#8A8D96"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                  />
                )}
              />
              {(codeFormErrors.code || errors.fields.code) && (
                <Text className="text-coral-600 mb-4 text-sm">
                  {codeFormErrors.code?.message || errors.fields.code?.message}
                </Text>
              )}
              <TouchableOpacity
                onPress={() => {
                  void handleCodeSubmit(onVerifyPress)();
                }}
                disabled={isLoading}
                className="w-full bg-[#1D4E5B] py-4 rounded-xl items-center mb-3"
              >
                {isLoading ? (
                  <ActivityIndicator color="white"/>
                ) : (
                  <Text className="text-white font-semibold text-xl">Verify email</Text>
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
              <TouchableOpacity
                onPress={() => signUp.reset()}
                disabled={isLoading}
                className="w-full py-3 rounded-xl items-center mb-4"
              >
                <Text className="text-blue-500 underline">Start over</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
      )
    }
 
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS==="ios"?"padding":"height"}
      className="flex-1 "
    >
    <View 
      className="flex-1 justify-center items-stretch px-6 -mt-16"
    >
      <Image 
          source={require("../../../assets/images/edl.png")}
          className="w-36 h-16 mb-8 "
          resizeMode="contain"
      />
      <Text className="text-left text-3xl font-bold text-[#1A1D26] mb-2 leading-tight">Create Account</Text>
      <Text className="text-left text-base text-gray-600 mb-2 leading-tight">Track your money, powered by AI</Text>
      
      <View className="w-full gap-3 mb-1">
        <View className="w-full flex-row gap-3">
          <Controller
            control={control}
            name="firstName"
            render={({ field: { value, onChange } }) => (
              <TextInput
                className="flex-1 text-left border border-[#E8E6DF] bg-white rounded-xl px-4 py-3 text-[#1A1D26]"
                placeholder="First Name"
                placeholderTextColor="#8A8D96"
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
              />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field: { value, onChange } }) => (
              <TextInput
                className="flex-1 text-left border border-[#E8E6DF] bg-white rounded-xl px-4 py-3 text-[#1A1D26]"
                placeholder="Last Name"
                placeholderTextColor="#8A8D96"
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
              />
            )}
          />
        </View>
          {(formErrors.firstName || formErrors.lastName)&& (
            <Text className="text-coral-600 mb-4 text-sm">
              {formErrors.firstName?.message || formErrors.lastName?.message}
            </Text>
          )}
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange } }) => (
            <TextInput
              className="w-full text-left border border-[#E8E6DF] bg-white rounded-xl px-4 py-3 text-[#1A1D26] "
              placeholder="Email"
              placeholderTextColor="#8A8D96"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          )}
        />
      {(formErrors.email)&& (
        <Text className="text-coral-600 mb-4 text-sm">
          {formErrors.email?.message }
        </Text>
      )}
       {(errors.fields.emailAddress)&& (
        <Text className="text-coral-600 mb-4 text-sm">
          {errors.fields.emailAddress?.message }
        </Text>
      )}

      
      {/* Password */}
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
         {(formErrors.password)&& (
        <Text className="text-coral-600 mb-4 text-sm">
          {formErrors.password.message}
        </Text>
      )}
       {(errors.fields.password)&& (
        <Text className="text-coral-600 mb-4 text-sm">
          {errors.fields.password?.message}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => {
          void handleSubmit(onSignUpPress)();
        }}
        disabled={isLoading}
        className="w-full bg-[#1D4E5B]  py-4 rounded-xl items-center mb-4">
        {isLoading ? (
          <ActivityIndicator color="white"/>
        ):(
          <Text className= "text-white font-semibold text-xl">Sign Up</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center">
        <Text className="text-gray-500 font-semibold">Already have an account?</Text>
        <Link href={"/sign-in"} >
          <Text className="text-blue-500 underline underline-offset-4">Sign In</Text>
        </Link>
      </View>

      </View>
      {/* Required by Clerk for bot protection */}
      <View nativeID="clerk-captcha"/>
    </View>
    </KeyboardAvoidingView>
  )
}