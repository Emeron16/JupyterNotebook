"use client"

import { useState } from "react"
import { Plus, Search, Filter, Building2, Calendar, DollarSign, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type JobApplication = {
  id: string
  company: string
  position: string
  location: string
  salary: string
  status: "applied" | "interview" | "offer" | "rejected" | "withdrawn"
  appliedDate: string
  lastUpdate: string
  notes: string
  jobUrl?: string
}

const initialApplications: JobApplication[] = [
  {
    id: "1",
    company: "TechCorp",
    position: "Senior Frontend Developer",
    location: "San Francisco, CA",
    salary: "$120,000 - $150,000",
    status: "interview",
    appliedDate: "2024-01-15",
    lastUpdate: "2024-01-20",
    notes: "Second round interview scheduled for next week",
    jobUrl: "https://example.com/job1",
  },
  {
    id: "2",
    company: "StartupXYZ",
    position: "Full Stack Engineer",
    location: "Remote",
    salary: "$100,000 - $130,000",
    status: "applied",
    appliedDate: "2024-01-18",
    lastUpdate: "2024-01-18",
    notes: "Applied through company website",
    jobUrl: "https://example.com/job2",
  },
  {
    id: "3",
    company: "BigTech Inc",
    position: "Software Engineer",
    location: "Seattle, WA",
    salary: "$140,000 - $180,000",
    status: "rejected",
    appliedDate: "2024-01-10",
    lastUpdate: "2024-01-17",
    notes: "Received rejection email after initial screening",
    jobUrl: "https://example.com/job3",
  },
  {
    id: "4",
    company: "InnovateLabs",
    position: "React Developer",
    location: "Austin, TX",
    salary: "$90,000 - $120,000",
    status: "offer",
    appliedDate: "2024-01-05",
    lastUpdate: "2024-01-22",
    notes: "Received offer! Need to respond by Friday",
    jobUrl: "https://example.com/job4",
  },
]

const statusColors = {
  applied: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  interview: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  offer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  withdrawn: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
}

export default function JobTrackerDashboard() {
  const [applications, setApplications] = useState<JobApplication[]>(initialApplications)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newApplication, setNewApplication] = useState<Partial<JobApplication>>({
    company: "",
    position: "",
    location: "",
    salary: "",
    status: "applied",
    notes: "",
    jobUrl: "",
  })

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || app.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: applications.length,
    applied: applications.filter((app) => app.status === "applied").length,
    interviews: applications.filter((app) => app.status === "interview").length,
    offers: applications.filter((app) => app.status === "offer").length,
  }

  const handleAddApplication = () => {
    if (newApplication.company && newApplication.position) {
      const application: JobApplication = {
        id: Date.now().toString(),
        company: newApplication.company,
        position: newApplication.position,
        location: newApplication.location || "",
        salary: newApplication.salary || "",
        status: (newApplication.status as JobApplication["status"]) || "applied",
        appliedDate: new Date().toISOString().split("T")[0],
        lastUpdate: new Date().toISOString().split("T")[0],
        notes: newApplication.notes || "",
        jobUrl: newApplication.jobUrl || "",
      }
      setApplications([...applications, application])
      setNewApplication({
        company: "",
        position: "",
        location: "",
        salary: "",
        status: "applied",
        notes: "",
        jobUrl: "",
      })
      setIsAddDialogOpen(false)
    }
  }

  const updateApplicationStatus = (id: string, newStatus: JobApplication["status"]) => {
    setApplications(
      applications.map((app) =>
        app.id === id ? { ...app, status: newStatus, lastUpdate: new Date().toISOString().split("T")[0] } : app,
      ),
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Job Application Tracker</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage and track your job applications</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Application
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Job Application</DialogTitle>
                <DialogDescription>Enter the details of your new job application.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="company">Company *</Label>
                  <Input
                    id="company"
                    value={newApplication.company || ""}
                    onChange={(e) => setNewApplication({ ...newApplication, company: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    value={newApplication.position || ""}
                    onChange={(e) => setNewApplication({ ...newApplication, position: e.target.value })}
                    placeholder="Job title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newApplication.location || ""}
                    onChange={(e) => setNewApplication({ ...newApplication, location: e.target.value })}
                    placeholder="City, State or Remote"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="salary">Salary Range</Label>
                  <Input
                    id="salary"
                    value={newApplication.salary || ""}
                    onChange={(e) => setNewApplication({ ...newApplication, salary: e.target.value })}
                    placeholder="$80,000 - $100,000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="jobUrl">Job URL</Label>
                  <Input
                    id="jobUrl"
                    value={newApplication.jobUrl || ""}
                    onChange={(e) => setNewApplication({ ...newApplication, jobUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newApplication.notes || ""}
                    onChange={(e) => setNewApplication({ ...newApplication, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddApplication}>
                  Add Application
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applied</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.applied}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interviews</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.interviews}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offers</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.offers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>Track and manage your job applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search companies, positions, or locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Applications Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Last Update</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">{application.company}</TableCell>
                      <TableCell>{application.position}</TableCell>
                      <TableCell>{application.location}</TableCell>
                      <TableCell>{application.salary}</TableCell>
                      <TableCell>
                        <Select
                          value={application.status}
                          onValueChange={(value) =>
                            updateApplicationStatus(application.id, value as JobApplication["status"])
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue>
                              <Badge className={statusColors[application.status]}>{application.status}</Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="applied">Applied</SelectItem>
                            <SelectItem value="interview">Interview</SelectItem>
                            <SelectItem value="offer">Offer</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="withdrawn">Withdrawn</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{new Date(application.appliedDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(application.lastUpdate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {application.jobUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={application.jobUrl} target="_blank" rel="noopener noreferrer">
                              View Job
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredApplications.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No applications found matching your criteria.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
