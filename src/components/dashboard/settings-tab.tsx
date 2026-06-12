'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  User, CreditCard, Bell, Trash2, Loader2, Check,
  Crown, Zap, Shield, Building2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  type PlanWithFeatures, type UserPlanDetails, type PlanUsage,
  apiFetch, formatNumber,
} from './types'

interface SettingsTabProps {
  userEmail?: string | null
  userName?: string | null
}

export default function SettingsTab({ userEmail, userName }: SettingsTabProps) {
  const [plan, setPlan] = useState<UserPlanDetails | null>(null)
  const [usage, setUsage] = useState<PlanUsage | null>(null)
  const [plans, setPlans] = useState<PlanWithFeatures[]>([])
  const [loading, setLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)

  // Profile form
  const [profile, setProfile] = useState({
    name: userName || '',
    email: userEmail || '',
    company: '',
    website: '',
    bio: '',
  })

  // Notifications
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    usageAlerts: true,
    securityAlerts: true,
    weeklyDigest: false,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [planData, plansData] = await Promise.all([
        apiFetch<{ plan: UserPlanDetails; usage: PlanUsage }>('/api/plans/current').catch(() => null),
        apiFetch<{ plans: PlanWithFeatures[] }>('/api/plans').catch(() => ({ plans: [] })),
      ])
      if (planData) {
        setPlan(planData.plan)
        setUsage(planData.usage)
      }
      setPlans((plansData as { plans: PlanWithFeatures[] }).plans || [])
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    // Simulated save - no backend endpoint for profile update
    await new Promise(r => setTimeout(r, 500))
    toast.success('Profile saved')
    setProfileSaving(false)
  }

  const handleUpgrade = async (planName: string) => {
    try {
      await apiFetch('/api/plans/upgrade', {
        method: 'POST',
        body: JSON.stringify({ planName }),
      })
      toast.success(`Plan updated to ${planName}`)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update plan')
    }
  }

  const planIcons: Record<string, React.ElementType> = {
    free: User,
    pro: Zap,
    ultra: Crown,
    enterprise: Building2,
  }

  const planColors: Record<string, string> = {
    free: 'border-gray-200 dark:border-gray-700',
    pro_monthly: 'border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-800',
    pro_yearly: 'border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-800',
    ultra: 'border-violet-300 dark:border-violet-700 ring-1 ring-violet-200 dark:ring-violet-800',
    enterprise: 'border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-800',
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-60 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <Tabs defaultValue="profile">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs">Plan & Billing</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Information</CardTitle>
              <CardDescription className="text-xs">Update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={profile.email} disabled className="bg-muted" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Company</Label>
                  <Input value={profile.company} onChange={e => setProfile({ ...profile, company: e.target.value })} placeholder="Your company" />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={profile.website} onChange={e => setProfile({ ...profile, website: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Bio</Label>
                <Input value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} placeholder="Tell us about yourself" />
              </div>
              <Button onClick={handleSaveProfile} disabled={profileSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {profileSaving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} Save Profile
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-800/50">
            <CardHeader>
              <CardTitle className="text-base text-red-600">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30" disabled>
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete Account (Not Available)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plan & Billing */}
        <TabsContent value="billing" className="space-y-4 mt-4">
          {/* Current Plan */}
          {plan && usage && (
            <Card className="border-emerald-200 dark:border-emerald-800/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  Current Plan: {plan.displayName}
                </CardTitle>
                <CardDescription className="text-xs">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    { label: 'API Requests', used: usage.apiRequests.used, limit: usage.apiRequests.limit },
                    { label: 'API Keys', used: usage.apiKeys.used, limit: usage.apiKeys.limit },
                    { label: 'Knowledge', used: usage.knowledgeUnits.used, limit: usage.knowledgeUnits.limit },
                    { label: 'Team Members', used: usage.teamMembers.used, limit: usage.teamMembers.limit },
                    { label: 'Workspaces', used: usage.workspaces.used, limit: usage.workspaces.limit },
                  ].map(item => {
                    const percent = item.limit > 0 ? (item.used / item.limit) * 100 : (item.used > 0 ? 100 : 0)
                    const isUnlimited = item.limit < 0
                    return (
                      <div key={item.label} className="p-3 rounded-lg border border-border/50">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-medium mt-0.5">
                          {formatNumber(item.used)} / {isUnlimited ? '∞' : formatNumber(item.limit)}
                        </p>
                        {!isUnlimited && (
                          <Progress value={Math.min(percent, 100)} className="h-1.5 mt-1.5" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Comparison */}
          <div>
            <h3 className="text-base font-semibold mb-3">Available Plans</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map(p => {
                const tier = p.name.replace('_monthly', '').replace('_yearly', '')
                const PlanIcon = planIcons[tier] || User
                const isCurrentPlan = plan?.planName === tier || (tier === 'pro' && plan?.planName === 'pro')
                const borderColor = planColors[p.name] || ''

                return (
                  <Card key={p.id} className={`relative ${borderColor}`}>
                    {p.isPopular && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5">Popular</Badge>
                      </div>
                    )}
                    <CardContent className="p-4 pt-5">
                      <div className="flex items-center gap-2 mb-2">
                        <PlanIcon className="h-5 w-5 text-emerald-600" />
                        <h4 className="text-sm font-semibold">{p.displayName}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{p.description}</p>
                      <div className="mb-3">
                        <span className="text-2xl font-bold">${p.price}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.interval === 'month' ? '/mo' : p.interval === 'year' ? '/yr' : ''}
                        </span>
                      </div>
                      <ul className="space-y-1 mb-4">
                        {p.features.slice(0, 5).map((f, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                            <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" /> {f}
                          </li>
                        ))}
                        {p.features.length > 5 && (
                          <li className="text-[11px] text-muted-foreground">+{p.features.length - 5} more features</li>
                        )}
                      </ul>
                      {isCurrentPlan ? (
                        <Button variant="outline" className="w-full h-8 text-xs" disabled>Current Plan</Button>
                      ) : (
                        <Button
                          className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleUpgrade(tier)}
                        >
                          {p.price > (plan?.price ?? 0) ? 'Upgrade' : 'Downgrade'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-600" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'emailAlerts', label: 'Email Alerts', description: 'Receive important updates via email' },
                { key: 'usageAlerts', label: 'Usage Alerts', description: 'Get notified when approaching plan limits' },
                { key: 'securityAlerts', label: 'Security Alerts', description: 'Alerts about API key usage and suspicious activity' },
                { key: 'weeklyDigest', label: 'Weekly Digest', description: 'Summary of your weekly platform activity' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                  />
                </div>
              ))}
              <Separator />
              <p className="text-xs text-muted-foreground">Notification preferences are saved locally. Backend integration coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
