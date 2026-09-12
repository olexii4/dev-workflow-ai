# PatternFly — che-dashboard UI Reference

> Load this file for any UI implementation or review in che-dashboard.
> PatternFly npm package: `@patternfly/react-core ^6.4.0` (PatternFly v5 component API — npm v6 = PF v5 design)
> GitHub: https://github.com/patternfly/patternfly
> Docs: https://www.patternfly.org/components/

---

## Import Pattern

Always import from the top-level package — never from dist paths:

```typescript
// Core components
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from '@patternfly/react-core';
import { Form, FormGroup, FormHelperText, HelperText, HelperTextItem, TextInput } from '@patternfly/react-core';
import { Breadcrumb, BreadcrumbItem, Content, Flex, FlexItem, PageSection, Stack, StackItem } from '@patternfly/react-core';

// Table components — separate package
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

// Icons — separate package
import { SearchIcon, PlusCircleIcon, TrashIcon } from '@patternfly/react-icons';
```

**Never use:** `@patternfly/react-core/dist/...` or `@patternfly/patternfly/...`

---

## Layout Components

| Component | Use case |
|---|---|
| `Page`, `PageSection`, `PageSidebar` | App shell structure |
| `Grid`, `GridItem` | Responsive grid layout |
| `Flex`, `FlexItem` | Flexbox arrangement |
| `Stack`, `StackItem` | Vertical stacking with spacing |
| `Split`, `SplitItem` | Horizontal split (one side fills) |
| `Bullseye` | Center content vertically and horizontally |
| `Gallery`, `GalleryItem` | Responsive card grid |

---

## Content & Typography

| Component | Use case |
|---|---|
| `Title` | Headings — `size`: `4xl` / `3xl` / `2xl` / `xl` / `lg` / `md` / `sm`; `headingLevel`: `h1`–`h6` |
| `Content` | Body text wrapper; use instead of raw `<p>` |
| `TextList`, `TextListItem` | Styled lists |
| `Label` | Status chips — `color`: `blue`/`green`/`orange`/`red`/`grey`/`purple` |
| `Badge` | Count badges |

---

## Forms

```typescript
// Full form pattern with validation
<Form>
  <FormGroup label="Token name" isRequired fieldId="token-name">
    <TextInput
      id="token-name"
      value={name}
      onChange={(_e, val) => setName(val)}
      validated={nameError ? 'error' : 'default'}
    />
    <FormHelperText>
      <HelperText>
        <HelperTextItem variant={nameError ? 'error' : 'default'}>
          {nameError ?? 'Enter a unique token name.'}
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  </FormGroup>

  <ActionGroup>
    <Button variant="primary" type="submit" isDisabled={!isValid}>Save</Button>
    <Button variant="link" onClick={onCancel}>Cancel</Button>
  </ActionGroup>
</Form>
```

**`validated` prop values:** `'success'` | `'warning'` | `'error'` | `'default'`

**Select pattern:**
```typescript
<Select
  isOpen={isOpen}
  onSelect={(_e, val) => { setSelected(val as string); setIsOpen(false); }}
  onOpenChange={setIsOpen}
  selected={selected}
  toggle={(ref) => (
    <MenuToggle ref={ref} onClick={() => setIsOpen(!isOpen)} isExpanded={isOpen}>
      {selected ?? 'Select...'}
    </MenuToggle>
  )}
>
  <SelectList>
    <SelectOption value="option1">Option 1</SelectOption>
    <SelectOption value="option2">Option 2</SelectOption>
  </SelectList>
</Select>
```

**Switch (keyboard toggle pattern — wrap in div with onKeyDown):**
```typescript
<div onKeyDown={(e) => { if (e.key === 'Enter') setChecked(c => !c); }}>
  <Switch
    id="my-switch"
    label="Enabled"
    isChecked={checked}
    onChange={(_e, val) => setChecked(val)}
  />
</div>
```

---

## Data Display

### Table
```typescript
<Table aria-label="Workspace list">
  <Thead>
    <Tr>
      <Th>Name</Th>
      <Th>Status</Th>
      <Th>Actions</Th>
    </Tr>
  </Thead>
  <Tbody>
    {rows.map(row => (
      <Tr key={row.id}>
        <Td>{row.name}</Td>
        <Td>{row.status}</Td>
        <Td><Button variant="plain" aria-label="Delete"><TrashIcon /></Button></Td>
      </Tr>
    ))}
  </Tbody>
</Table>
```

### DataList (non-tabular, richer layout)
```typescript
<DataList aria-label="AI tools">
  <DataListItem>
    <DataListItemRow>
      <DataListItemCells dataListCells={[
        <DataListCell key="name"><strong>OpenCode</strong></DataListCell>,
        <DataListCell key="status">Active</DataListCell>,
      ]} />
    </DataListItemRow>
  </DataListItem>
</DataList>
```

### DescriptionList
```typescript
<DescriptionList>
  <DescriptionListGroup>
    <DescriptionListTerm>Namespace</DescriptionListTerm>
    <DescriptionListDescription>{workspace.namespace}</DescriptionListDescription>
  </DescriptionListGroup>
</DescriptionList>
```

### EmptyState
```typescript
<EmptyState>
  <EmptyStateHeader
    icon={<EmptyStateIcon icon={SearchIcon} />}
    titleText="No workspaces found"
    headingLevel="h2"
  />
  <EmptyStateBody>No workspaces match your current filter.</EmptyStateBody>
  <EmptyStateFooter>
    <Button variant="link" onClick={clearFilters}>Clear all filters</Button>
  </EmptyStateFooter>
</EmptyState>
```

---

## Feedback & Overlays

### Alert
```typescript
<Alert variant="warning" title="Unsaved changes" isInline>
  You have unsaved changes that will be lost.
</Alert>
// variants: 'success' | 'danger' | 'warning' | 'info' | 'custom'
```

### Modal (confirm dialog pattern)
```typescript
<Modal isOpen={isOpen} onClose={onClose} variant="small" aria-label="Confirm delete">
  <ModalHeader title="Delete workspace?" />
  <ModalBody>
    <Content>This action cannot be undone.</Content>
  </ModalBody>
  <ModalFooter>
    <Button variant="danger" onClick={onConfirm}>Delete</Button>
    <Button variant="link" onClick={onClose}>Cancel</Button>
  </ModalFooter>
</Modal>
```

**Modal variants:** `'small'` | `'medium'` | `'large'` | `'xlarge'` | `'default'`

### Tooltip (icon hover color tokens)
```typescript
<Tooltip content="View logs">
  <Button variant="plain" aria-label="View logs">
    <LogsIcon
      style={{
        color: 'var(--pf-t--global--icon--color--subtle)',  // default
      }}
      className={styles.icon}  // use :hover in CSS: color: var(--pf-t--global--text--color--link--default)
    />
  </Button>
</Tooltip>
```

**Tooltip `<a>` link colors — inverse background:**
- Light theme tooltip: use dark tokens inside
- Dark theme tooltip: use light tokens inside
- See existing tooltip `.module.css` files for the pattern

### Spinner
```typescript
<Spinner size="lg" aria-label="Loading workspaces" />
// sizes: 'sm' | 'md' | 'lg' | 'xl'
```

---

## Navigation

### Tabs
```typescript
<Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key)}>
  <Tab eventKey="overview" title={<TabTitleText>Overview</TabTitleText>}>
    <TabContent>...</TabContent>
  </Tab>
  <Tab eventKey="devfile" title={<TabTitleText>Devfile</TabTitleText>}>
    <TabContent>...</TabContent>
  </Tab>
</Tabs>
```

### Toolbar (filter bar pattern)
```typescript
<Toolbar>
  <ToolbarContent>
    <ToolbarItem>
      <SearchInput
        placeholder="Filter by name"
        value={filter}
        onChange={(_e, val) => setFilter(val)}
        onClear={() => setFilter('')}
      />
    </ToolbarItem>
    <ToolbarItem variant="separator" />
    <ToolbarItem>
      <Button variant="primary" onClick={onCreate}>Create workspace</Button>
    </ToolbarItem>
  </ToolbarContent>
</Toolbar>
```

---

## Icons

```typescript
import {
  PlusCircleIcon,        // add/create actions
  TrashIcon,             // delete actions
  EditIcon,              // edit actions
  CheckCircleIcon,       // success state
  ExclamationCircleIcon, // error state
  ExclamationTriangleIcon, // warning state
  InfoCircleIcon,        // info state
  SearchIcon,            // search/filter
  FilterIcon,            // filter toggle
  EllipsisVIcon,         // kebab menu trigger
  ExternalLinkAltIcon,   // opens in new tab
  CopyIcon,              // copy to clipboard
  SyncAltIcon,           // refresh/reload
  StopCircleIcon,        // stop action
  PlayIcon,              // start action
} from '@patternfly/react-icons';
```

---

## Accessibility Rules

- All interactive elements without visible text **must** have `aria-label`
- Icon-only buttons: `variant="plain"` + `aria-label` required
- Modals: `aria-label` on `<Modal>`
- Tables: `aria-label` on `<Table>`
- DataLists: `aria-label` on `<DataList>`
- Filter inputs: `aria-label="Filter <resource> by <field>"`
- Keyboard toggle for `Switch`: wrap in `<div onKeyDown>` handling `Enter`
- `SelectOption` with `hasCheckbox`: add explicit `onKeyDown` on each option

---

## CSS Module Pattern

Every component with custom styles uses a CSS module:

```
ComponentName/
  index.tsx
  index.module.css
```

```typescript
import styles from './index.module.css';
// Usage: className={styles.myClass}
```

CSS property ordering (stylelint-config-clean-order):
1. Layout: `position`, `z-index`, `overflow`, `display`, `flex-*`, `grid-*`
2. Box/Size: `box-sizing`, `width`, `min-width`, `max-width`, `height`, `margin`, `padding`
3. Typography: `font-*`, `color`, `text-*`, `word-break`, `white-space`, `line-height`
4. Visual: `background`, `border*`, `border-radius`, `box-shadow`
5. Animation: `transition`, `animation`

Empty lines **between groups** when rule has ≥ 5 properties. No empty lines within a group.

---

## ErrorReporter Overlay

```css
/* Standard pattern for error overlays */
position: fixed;
inset: 0;
z-index: 9999;
```

Error `<pre>` blocks:
```css
max-width: 100%;
overflow-x: auto;
```
