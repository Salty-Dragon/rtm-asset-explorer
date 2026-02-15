import Link from 'next/link'
import { SOCIAL_LINKS } from '@/lib/constants'
import { Github, Twitter, MessageCircle } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 md:py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* About */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Raptoreum Asset Explorer</h3>
            <p className="text-sm text-muted-foreground">
              Explore Raptoreum blockchain assets, NFTs, and transactions with ease.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/assets"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Assets
                </Link>
              </li>
              <li>
                <Link
                  href="/blocks"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Blocks
                </Link>
              </li>
              <li>
                <Link
                  href="/creators"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Creators
                </Link>
              </li>
              <li>
                <Link
                  href="/stats"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Statistics
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/api-docs"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  API Documentation
                </Link>
              </li>
              <li>
                <a
                  href={SOCIAL_LINKS.WEBSITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Raptoreum.com
                </a>
              </li>
              <li>
                <a
                  href={SOCIAL_LINKS.GITHUB}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Community</h3>
            <div className="flex gap-4">
              <a
                href={SOCIAL_LINKS.GITHUB}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href={SOCIAL_LINKS.TWITTER}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href={SOCIAL_LINKS.DISCORD}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Discord"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Bottom */}
        <div className="flex flex-col gap-2 text-center text-sm text-muted-foreground md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} Raptoreum Asset Explorer. All rights reserved.</p>
          <p>Built with ❤️ for the Raptoreum community</p>
        </div>
      </div>
    </footer>
  )
}
