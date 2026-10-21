// ============================================================
// KitchenPulse Mobile — Authentication Screen
// Strict Auth Guard & Tenant Organization Selector
// ============================================================

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuthStore } from "../store/useAuthStore";
import { api } from "../api/client";
import { Organization } from "../types";

export default function AuthScreen() {
  const { login, register, isLoading } = useAuthStore();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupType, setSignupType] = useState<"new_org" | "join_org">("new_org");

  // Form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Admin");
  const [orgName, setOrgName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.auth
      .getOrganizations()
      .then((res) => {
        if (isMounted && res.organizations?.length > 0) {
          setOrganizations(res.organizations);
          setSelectedOrgId(res.organizations[0].id);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAuth = async () => {
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      if (mode === "login") {
        await login(email.trim().toLowerCase(), password);
      } else {
        if (signupType === "new_org" && !orgName.trim()) {
          setErrorMessage("Please enter a Hotel or Restaurant name.");
          return;
        }
        await register({
          name: name.trim() || email.split("@")[0],
          email: email.trim().toLowerCase(),
          password,
          role: signupType === "new_org" ? "Owner" : role,
          organization_name: signupType === "new_org" ? orgName.trim() : undefined,
          organization_id: signupType === "join_org" ? selectedOrgId : undefined,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Authentication failed.");
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setErrorMessage(null);
    try {
      await login(demoEmail, "password123");
    } catch (err: any) {
      setErrorMessage(err.message || "Demo login failed");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Branding */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🔥</Text>
          </View>
          <Text style={styles.brandTitle}>
            Kitchen<Text style={styles.brandAccent}>Pulse</Text>
          </Text>
          <Text style={styles.brandSubtitle}>
            Commercial Kitchen Station & Supply Chain System
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Mode Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, mode === "login" && styles.activeTabButton]}
              onPress={() => {
                setMode("login");
                setErrorMessage(null);
              }}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  mode === "login" && styles.activeTabButtonText,
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, mode === "signup" && styles.activeTabButton]}
              onPress={() => {
                setMode("signup");
                setErrorMessage(null);
              }}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  mode === "signup" && styles.activeTabButtonText,
                ]}
              >
                Register
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}

          {/* Sign Up Fields */}
          {mode === "signup" && (
            <>
              {/* Type Switcher */}
              <View style={styles.signupTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    signupType === "new_org" && styles.typeBtnActiveOwner,
                  ]}
                  onPress={() => setSignupType("new_org")}
                >
                  <Text style={styles.typeBtnText}>👑 New Hotel (Owner)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    signupType === "join_org" && styles.typeBtnActiveAdmin,
                  ]}
                  onPress={() => setSignupType("join_org")}
                >
                  <Text style={styles.typeBtnText}>🛡️ Join (Admin/Staff)</Text>
                </TouchableOpacity>
              </View>

              {signupType === "new_org" ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Hotel / Restaurant Name</Text>
                  <TextInput
                    style={[styles.input, styles.inputHighlight]}
                    placeholder="e.g. Grand Palace Hotel"
                    placeholderTextColor="#64748b"
                    value={orgName}
                    onChangeText={setOrgName}
                  />
                  <Text style={styles.helperText}>
                    You will be assigned the <Text style={{ color: "#f59e0b", fontWeight: "bold" }}>Owner</Text> role with full administrative access.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Select Client Organization</Text>
                    <View style={styles.orgPickerList}>
                      {organizations.map((o) => (
                        <TouchableOpacity
                          key={o.id}
                          style={[
                            styles.orgOption,
                            selectedOrgId === o.id && styles.orgOptionSelected,
                          ]}
                          onPress={() => setSelectedOrgId(o.id)}
                        >
                          <Text
                            style={[
                              styles.orgOptionText,
                              selectedOrgId === o.id && styles.orgOptionTextSelected,
                            ]}
                          >
                            🏨 {o.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Role</Text>
                    <View style={styles.rolePickerList}>
                      {["Admin", "Executive Chef", "Line Cook"].map((r) => (
                        <TouchableOpacity
                          key={r}
                          style={[
                            styles.roleOption,
                            role === r && styles.roleOptionSelected,
                          ]}
                          onPress={() => setRole(r)}
                        >
                          <Text
                            style={[
                              styles.roleOptionText,
                              role === r && styles.roleOptionTextSelected,
                            ]}
                          >
                            {r}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Rajesh Singhania or Sanjeev Kapoor"
                  placeholderTextColor="#64748b"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </>
          )}

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="chef@kitchenpulse.io"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === "login" ? "Sign In to Station" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Demo Logins Section */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>⚡ 1-TAP DEMO CLIENT LOGINS</Text>
          <View style={styles.demoGrid}>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleQuickDemo("owner@grandpalace.com")}
            >
              <Text style={styles.demoBtnText}>👑 Grand Palace Mumbai (Owner)</Text>
              <Text style={styles.demoEmail}>owner@grandpalace.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleQuickDemo("admin@grandpalace.com")}
            >
              <Text style={styles.demoBtnText}>🛡️ Grand Palace Mumbai (Admin)</Text>
              <Text style={styles.demoEmail}>admin@grandpalace.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleQuickDemo("owner@bellanapoli.com")}
            >
              <Text style={styles.demoBtnText}>👑 Bella Napoli Bengaluru (Owner)</Text>
              <Text style={styles.demoEmail}>owner@bellanapoli.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleQuickDemo("cook@grandpalace.com")}
            >
              <Text style={styles.demoBtnText}>🍳 Grand Palace (Line Cook)</Text>
              <Text style={styles.demoEmail}>cook@grandpalace.com</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: "#070B14",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 48 : 32,
    paddingBottom: 40,
    alignItems: "center",
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#38bdf8",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  logoIcon: {
    fontSize: 26,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: "#38bdf8",
  },
  brandSubtitle: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
    textAlign: "center",
    maxWidth: 280,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "rgba(13, 20, 36, 0.82)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(6, 10, 20, 0.7)",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: "#0284c7",
    shadowColor: "#38bdf8",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
  },
  activeTabButtonText: {
    color: "#ffffff",
  },
  errorBox: {
    backgroundColor: "rgba(225, 29, 72, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.4)",
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    color: "#fda4af",
    fontSize: 12,
    fontWeight: "600",
  },
  signupTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  typeBtnActiveOwner: {
    borderColor: "#f59e0b",
    backgroundColor: "rgba(245, 158, 11, 0.18)",
  },
  typeBtnActiveAdmin: {
    borderColor: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.18)",
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f8fafc",
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#cbd5e1",
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f8fafc",
    fontSize: 13,
  },
  inputHighlight: {
    borderColor: "rgba(245, 158, 11, 0.5)",
  },
  helperText: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
  },
  orgPickerList: {
    gap: 6,
  },
  orgOption: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  orgOptionSelected: {
    borderColor: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  orgOptionText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  orgOptionTextSelected: {
    color: "#38bdf8",
    fontWeight: "800",
  },
  rolePickerList: {
    flexDirection: "row",
    gap: 6,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
  },
  roleOptionSelected: {
    borderColor: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  roleOptionText: {
    color: "#94a3b8",
    fontSize: 11,
  },
  roleOptionTextSelected: {
    color: "#38bdf8",
    fontWeight: "800",
  },
  submitButton: {
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#38bdf8",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  demoSection: {
    width: "100%",
    maxWidth: 440,
    marginTop: 18,
    padding: 14,
    backgroundColor: "rgba(13, 20, 36, 0.8)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  demoTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.6,
    textAlign: "center",
    marginBottom: 10,
  },
  demoGrid: {
    gap: 6,
  },
  demoBtn: {
    padding: 9,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  demoBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f8fafc",
  },
  demoEmail: {
    fontSize: 9,
    color: "#94a3b8",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 2,
  },
});
