import { AdminLayout } from "@/components/layout/admin-layout"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

const stats = [
  {
    title: "Total Users",
    value: "12,345",
    change: "+12.5%",
    trend: "up" as const,
    icon: Users,
  },
  {
    title: "Revenue",
    value: "$54,321",
    change: "+8.2%",
    trend: "up" as const,
    icon: DollarSign,
  },
  {
    title: "Orders",
    value: "1,234",
    change: "-3.1%",
    trend: "down" as const,
    icon: ShoppingCart,
  },
  {
    title: "Growth",
    value: "23.5%",
    change: "+4.3%",
    trend: "up" as const,
    icon: TrendingUp,
  },
]

const recentOrders = [
  {
    id: "ORD-001",
    customer: "John Doe",
    amount: "$250.00",
    status: "Completed",
  },
  {
    id: "ORD-002",
    customer: "Jane Smith",
    amount: "$180.00",
    status: "Processing",
  },
  {
    id: "ORD-003",
    customer: "Bob Johnson",
    amount: "$320.00",
    status: "Completed",
  },
  {
    id: "ORD-004",
    customer: "Alice Brown",
    amount: "$95.00",
    status: "Pending",
  },
  {
    id: "ORD-005",
    customer: "Charlie Wilson",
    amount: "$410.00",
    status: "Completed",
  },
]

const recentActivities = [
  { message: "New user registered", time: "2 min ago" },
  { message: "Order #ORD-001 completed", time: "15 min ago" },
  { message: "Product stock updated", time: "1 hour ago" },
  { message: "New review submitted", time: "2 hours ago" },
  { message: "Payment received for #ORD-003", time: "3 hours ago" },
]

export default function DashboardPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Welcome back! Here&apos;s an overview of your business.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>{stat.title}</CardDescription>
                  <stat.icon className="size-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-xs">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="size-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="size-3 text-red-500" />
                  )}
                  <span
                    className={
                      stat.trend === "up"
                        ? "text-emerald-500"
                        : "text-red-500"
                    }
                  >
                    {stat.change}
                  </span>
                  <span className="text-muted-foreground">from last month</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid gap-4 lg:grid-cols-7">
          {/* Recent Orders */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest orders from your store</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{order.customer}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.id}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {order.amount}
                      </span>
                      <Badge
                        variant={
                          order.status === "Completed"
                            ? "default"
                            : order.status === "Processing"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest activities in your system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 size-2 rounded-full bg-primary shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
