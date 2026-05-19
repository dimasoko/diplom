type LogoProps = {
  className?: string
}

export default function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`font-display leading-none text-primary ${className}`}>
       we are BASEcoffee
    </div>
  )
}
