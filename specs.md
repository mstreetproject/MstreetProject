# MStreet Finance - Design System & Style Guide

## Brand Identity

### Brand Name
**MStreet Finance** - Accessible and flexible finance management

### Tagline
"Helping people and businesses grow by giving them the financial tools they need to grow."

---

## Color Palette

### Primary Colors
```css
--mstreet-navy: #070757;        /* Primary brand color - backgrounds */
--mstreet-skyline: #02B3FF;     /* Secondary brand color - accents */
--mstreet-lime: #B8DB0F;        /* Tertiary brand color - highlights */
```

### Gradient Brand
```css
--gradient-primary: linear-gradient(135deg, #02B3FF, #B8DB0F);
--gradient-background: linear-gradient(135deg, #070757 0%, #0a0a6b 100%);
```

### Neutral Colors
```css
--white: #FFFFFF;
--gray-50: #F8FAFC;
--gray-100: #F1F5F9;
--gray-200: #E2E8F0;
--gray-300: #CBD5E1;
--gray-400: #94A3B8;
--gray-500: #64748B;
--gray-600: #475569;
--gray-700: #334155;
--gray-800: #1E293B;
--gray-900: #0F172A;
--black: #000000;
```

### Semantic Colors
```css
--success: #10B981;
--success-light: rgba(16, 185, 129, 0.1);
--warning: #F59E0B;
--warning-light: rgba(245, 158, 11, 0.1);
--error: #EF4444;
--error-light: rgba(239, 68, 68, 0.1);
--info: #3B82F6;
--info-light: rgba(59, 130, 246, 0.1);
```

---

## Typography

### Font Family
```css
--font-primary: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'Fira Code', 'Courier New', monospace;
```

### Font Sizes
```css
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
--text-5xl: 3rem;        /* 48px */
```

### Font Weights
```css
--font-light: 300;
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
```

### Line Heights
```css
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
--leading-loose: 2;
```

---

## Spacing Scale

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
```

---

## Border Radius

```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 24px;
--radius-full: 9999px;
```

---

## Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
--shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25);
--shadow-brand: 0 4px 20px rgba(2, 179, 255, 0.3);
```

---

## Component Styles

### Buttons

#### Primary Button
```tsx
{
  padding: "14px 32px",
  fontSize: "1rem",
  fontWeight: "700",
  borderRadius: "12px",
  border: "none",
  background: "linear-gradient(135deg, #02B3FF, #B8DB0F)",
  color: "#070757",
  cursor: "pointer",
  transition: "transform 0.2s, box-shadow 0.2s",
  boxShadow: "0 4px 20px rgba(2, 179, 255, 0.3)",
}

// Hover state
:hover {
  transform: translateY(-2px);
  boxShadow: "0 6px 25px rgba(2, 179, 255, 0.4)";
}
```

#### Secondary Button
```tsx
{
  padding: "14px 32px",
  fontSize: "1rem",
  fontWeight: "600",
  borderRadius: "12px",
  background: "rgba(255, 255, 255, 0.05)",
  color: "#fff",
  border: "2px solid rgba(2, 179, 255, 0.3)",
  cursor: "pointer",
  transition: "all 0.2s",
}

// Hover state
:hover {
  background: "rgba(255, 255, 255, 0.1)",
  borderColor: "#02B3FF",
}
```

#### Outline Button
```tsx
{
  padding: "12px 24px",
  fontSize: "0.95rem",
  fontWeight: "600",
  borderRadius: "10px",
  background: "transparent",
  color: "#02B3FF",
  border: "1.5px solid #02B3FF",
  cursor: "pointer",
  transition: "all 0.2s",
}

// Hover state
:hover {
  background: "rgba(2, 179, 255, 0.1)",
}
```

#### Danger Button
```tsx
{
  padding: "12px 24px",
  fontSize: "0.95rem",
  fontWeight: "600",
  borderRadius: "10px",
  background: "#EF4444",
  color: "white",
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s",
}

// Hover state
:hover {
  background: "#DC2626",
}
```

---

### Cards

#### Standard Card
```tsx
{
  background: "rgba(255, 255, 255, 0.03)",
  backdropFilter: "blur(12px)",
  borderRadius: "16px",
  padding: "24px",
  border: "1px solid rgba(2, 179, 255, 0.15)",
  transition: "all 0.3s",
}

// Hover state
:hover {
  border: "1px solid rgba(2, 179, 255, 0.3)",
  transform: "translateY(-2px)",
}
```

#### Elevated Card
```tsx
{
  background: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(16px)",
  borderRadius: "20px",
  padding: "32px",
  border: "1px solid rgba(2, 179, 255, 0.2)",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
}
```

---

### Form Inputs

#### Text Input
```tsx
{
  padding: "12px 16px",
  fontSize: "1rem",
  borderRadius: "10px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(255, 255, 255, 0.05)",
  color: "white",
  outline: "none",
  transition: "border-color 0.2s, background 0.2s",
}

// Focus state
:focus {
  borderColor: "#02B3FF",
  background: "rgba(255, 255, 255, 0.08)",
}

// Error state
.error {
  borderColor: "#EF4444",
}
```

#### Label
```tsx
{
  fontSize: "0.875rem",
  fontWeight: "600",
  color: "#E2E8F0",
  marginBottom: "8px",
  display: "block",
}
```

---

### Navigation

#### Sidebar
```tsx
{
  width: "280px",
  height: "100vh",
  background: "rgba(7, 7, 87, 0.95)",
  backdropFilter: "blur(10px)",
  borderRight: "1px solid rgba(2, 179, 255, 0.2)",
  padding: "24px 16px",
  position: "fixed",
  left: 0,
  top: 0,
  overflowY: "auto",
}
```

#### Nav Item (Active)
```tsx
{
  padding: "12px 16px",
  borderRadius: "10px",
  background: "linear-gradient(135deg, rgba(2, 179, 255, 0.2), rgba(184, 219, 15, 0.1))",
  color: "#B8DB0F",
  fontWeight: "600",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "8px",
  borderLeft: "3px solid #B8DB0F",
}
```

#### Nav Item (Inactive)
```tsx
{
  padding: "12px 16px",
  borderRadius: "10px",
  background: "transparent",
  color: "#94A3B8",
  fontWeight: "500",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "8px",
  transition: "all 0.2s",
}

// Hover state
:hover {
  background: "rgba(255, 255, 255, 0.05)",
  color: "#CBD5E1",
}
```

#### Hamburger Menu Icon
```tsx
{
  width: "32px",
  height: "32px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-around",
  padding: "4px",
  cursor: "pointer",
  background: "rgba(255, 255, 255, 0.05)",
  borderRadius: "8px",
  border: "1px solid rgba(2, 179, 255, 0.2)",
}

// Individual bars
.bar {
  width: "100%",
  height: "3px",
  background: "#02B3FF",
  borderRadius: "2px",
  transition: "all 0.3s",
}
```

---

### Tables

#### Table Container
```tsx
{
  background: "rgba(255, 255, 255, 0.02)",
  borderRadius: "12px",
  overflow: "hidden",
  border: "1px solid rgba(2, 179, 255, 0.1)",
}
```

#### Table Header
```tsx
{
  background: "rgba(2, 179, 255, 0.1)",
  padding: "16px",
  fontWeight: "700",
  fontSize: "0.875rem",
  color: "#02B3FF",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "2px solid rgba(2, 179, 255, 0.2)",
}
```

#### Table Row
```tsx
{
  padding: "16px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  transition: "background 0.2s",
}

// Hover state
:hover {
  background: "rgba(255, 255, 255, 0.03)",
}
```

---

### Modals

#### Modal Overlay
```tsx
{
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.7)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
}
```

#### Modal Content
```tsx
{
  background: "rgba(7, 7, 87, 0.95)",
  backdropFilter: "blur(20px)",
  borderRadius: "20px",
  padding: "32px",
  maxWidth: "600px",
  width: "90%",
  border: "1px solid rgba(2, 179, 255, 0.3)",
  boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
}
```

---

### Badges

#### Status Badge (Active)
```tsx
{
  padding: "6px 12px",
  borderRadius: "20px",
  fontSize: "0.75rem",
  fontWeight: "600",
  background: "rgba(16, 185, 129, 0.2)",
  color: "#10B981",
  border: "1px solid rgba(16, 185, 129, 0.3)",
  display: "inline-block",
}
```

#### Status Badge (Pending)
```tsx
{
  padding: "6px 12px",
  borderRadius: "20px",
  fontSize: "0.75rem",
  fontWeight: "600",
  background: "rgba(245, 158, 11, 0.2)",
  color: "#F59E0B",
  border: "1px solid rgba(245, 158, 11, 0.3)",
  display: "inline-block",
}
```

#### Status Badge (Inactive)
```tsx
{
  padding: "6px 12px",
  borderRadius: "20px",
  fontSize: "0.75rem",
  fontWeight: "600",
  background: "rgba(148, 163, 184, 0.2)",
  color: "#94A3B8",
  border: "1px solid rgba(148, 163, 184, 0.3)",
  display: "inline-block",
}
```

---

### Alerts

#### Info Alert
```tsx
{
  padding: "16px 20px",
  borderRadius: "12px",
  background: "rgba(59, 130, 246, 0.1)",
  border: "1px solid rgba(59, 130, 246, 0.3)",
  color: "#3B82F6",
  fontSize: "0.95rem",
  display: "flex",
  alignItems: "center",
  gap: "12px",
}
```

#### Success Alert
```tsx
{
  padding: "16px 20px",
  borderRadius: "12px",
  background: "rgba(16, 185, 129, 0.1)",
  border: "1px solid rgba(16, 185, 129, 0.3)",
  color: "#10B981",
  fontSize: "0.95rem",
  display: "flex",
  alignItems: "center",
  gap: "12px",
}
```

#### Warning Alert
```tsx
{
  padding: "16px 20px",
  borderRadius: "12px",
  background: "rgba(245, 158, 11, 0.1)",
  border: "1px solid rgba(245, 158, 11, 0.3)",
  color: "#F59E0B",
  fontSize: "0.95rem",
  display: "flex",
  alignItems: "center",
  gap: "12px",
}
```

#### Error Alert
```tsx
{
  padding: "16px 20px",
  borderRadius: "12px",
  background: "rgba(239, 68, 68, 0.1)",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  color: "#EF4444",
  fontSize: "0.95rem",
  display: "flex",
  alignItems: "center",
  gap: "12px",
}
```

---

## Layout Guidelines

### Container Max Widths
```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
```

### Breakpoints
```css
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
--breakpoint-2xl: 1536px;
```

### Grid System
```tsx
// 12-column grid
{
  display: "grid",
  gridTemplateColumns: "repeat(12, 1fr)",
  gap: "24px",
}

// Responsive columns
@media (max-width: 768px) {
  gridTemplateColumns: "1fr";
}
```

---

## Animation & Transitions

### Standard Transitions
```css
--transition-fast: 150ms ease-in-out;
--transition-normal: 250ms ease-in-out;
--transition-slow: 350ms ease-in-out;
```

### Common Animations
```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale in */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

---

## Accessibility Guidelines

### Minimum Contrast Ratios
- **Normal text**: 4.5:1
- **Large text (18px+)**: 3:1
- **Interactive elements**: 3:1

### Focus States
All interactive elements must have visible focus states:
```css
:focus-visible {
  outline: 2px solid #02B3FF;
  outline-offset: 2px;
}
```

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Tab order must be logical
- Skip links for main content navigation

---

## Icon System

### Size Scale
```css
--icon-xs: 12px;
--icon-sm: 16px;
--icon-md: 20px;
--icon-lg: 24px;
--icon-xl: 32px;
--icon-2xl: 48px;
```

### Recommended Icon Libraries
- **Lucide React** (primary)
- **Heroicons** (fallback)
- **React Icons** (comprehensive)

---

## Usage Examples

### Dashboard Card with Stats
```tsx
<div style={{
  background: "rgba(255, 255, 255, 0.03)",
  backdropFilter: "blur(12px)",
  borderRadius: "16px",
  padding: "24px",
  border: "1px solid rgba(2, 179, 255, 0.15)",
}}>
  <h3 style={{ fontSize: "0.875rem", color: "#94A3B8", marginBottom: "8px" }}>
    Total Revenue
  </h3>
  <p style={{ fontSize: "2rem", fontWeight: "800", color: "#fff" }}>
    $45,231.89
  </p>
  <p style={{ fontSize: "0.875rem", color: "#10B981", marginTop: "8px" }}>
    +20.1% from last month
  </p>
</div>
```

### Action Button Group
```tsx
<div style={{ display: "flex", gap: "12px" }}>
  <button style={{
    padding: "12px 24px",
    background: "linear-gradient(135deg, #02B3FF, #B8DB0F)",
    color: "#070757",
    border: "none",
    borderRadius: "10px",
    fontWeight: "600",
  }}>
    Approve
  </button>
  <button style={{
    padding: "12px 24px",
    background: "rgba(255, 255, 255, 0.05)",
    color: "#fff",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "10px",
  }}>
    Decline
  </button>
</div>
```

---

## Best Practices

1. **Consistency**: Always use design tokens from this guide
2. **Spacing**: Use the spacing scale for all margins and paddings
3. **Colors**: Never use hardcoded colors outside this palette
4. **Typography**: Stick to the font scale for text sizes
5. **Accessibility**: Test with screen readers and keyboard navigation
6. **Responsiveness**: All components must work on mobile, tablet, and desktop
7. **Performance**: Use `backdrop-filter` sparingly, prefer solid backgrounds when possible
8. **Dark Mode**: All designs are optimized for dark backgrounds (#070757)

---

*Last updated:* January 15, 2026
*Version:* 1.0
