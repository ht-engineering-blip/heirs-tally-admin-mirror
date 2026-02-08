import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  /**
   * Link href for the logo
   * @default "/"
   */
  href?: string
  /**
   * Logo image source path
   * @default "/logo.png"
   */
  src?: string
  /**
   * Alt text for the logo image
   * @default "Heirs Tally"
   */
  alt?: string
  /**
   * Logo image width
   * @default 30
   */
  width?: number
  /**
   * Logo image height
   * @default 30
   */
  height?: number
  /**
   * Image className
   */
  imageClassName?: string
  /**
   * Link className
   */
  linkClassName?: string
  /**
   * Show text next to logo
   * @default false
   */
  showText?: boolean
  /**
   * Title text to show
   * @default "Heirs Tally"
   */
  title?: string
  /**
   * Subtitle text to show
   */
  subtitle?: string
  /**
   * Container className
   */
  className?: string
  /**
   * Whether to render as a link or just a div
   * @default true
   */
  asLink?: boolean
}

export function Logo({
  href = '/',
  src = '/logo.png',
  alt = 'Heirs Tally',
  width = 30,
  height = 30,
  imageClassName,
  linkClassName,
  showText = false,
  title = 'Heirs Tally',
  subtitle,
  className,
  asLink = true,
}: LogoProps) {
  const imageElement = (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn('w-10 h-10', imageClassName)}
    />
  )

  const content = (
    <div className={cn('flex items-center gap-2 flex-row', className)}>
      {imageElement}
      {showText && (
        <div className="flex flex-col">
          <span className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </span>
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  )

  if (!asLink) {
    return content
  }

  return (
    <Link
      href={href}
      className={cn(
        'text-base font-semibold tracking-tight text-foreground/70 flex items-center gap-2 flex-row',
        linkClassName
      )}
    >
      {content}
    </Link>
  )
}
