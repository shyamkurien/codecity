export interface LanguageBreakdown {
  language: string
  lines: number
  percentage: number
  color: string
}

export interface DirectoryNode {
  name: string
  path: string
  age_days: number
  lines: number
  languages: LanguageBreakdown[]
  children: DirectoryNode[]
}

export interface RepoAnalysis {
  id: string
  name: string
  path: string
  age_days: number
  total_lines: number
  languages: LanguageBreakdown[]
  directories: DirectoryNode[]
}
