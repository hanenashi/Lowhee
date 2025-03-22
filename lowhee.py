import pygame
import math
import random
import colorsys
import time

# Initialize Pygame
pygame.init()

# Set up the display
WIDTH, HEIGHT = 1080, 1920
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Spinning Lottery Wheel")

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
RED = (255, 0, 0)
DARK_BROWN = (139, 69, 19)
BUTTON_TOP = (200, 200, 200)
BUTTON_BOTTOM = (150, 150, 150)
BUTTON_HOVER_TOP = (220, 220, 220)
BUTTON_HOVER_BOTTOM = (170, 170, 170)

# Wheel properties
CENTER = (WIDTH // 2, HEIGHT // 2 - 200)
RADIUS = 500

# Global variables (initial values)
initial_sections = 37
max_speed = 20
min_spins = 5
max_spins = 10
deceleration = 0.1
darkness = 1

# Runtime variables
remaining_numbers = list(range(1, initial_sections + 1))
number_colors = {}
spinning = False
auto_spinning = False
auto_spin_count = 0
angle = 90
spin_speed = 0
spin_distance_remaining = 0
winners = []
settings_active = False
dragging = False
last_pos = None
last_time = None
drag_velocity = 0

# Font
font = pygame.font.SysFont(None, 36)
winner_font = pygame.font.SysFont(None, 40)
settings_font = pygame.font.SysFont(None, 60)

# Button properties
BUTTON_WIDTH, BUTTON_HEIGHT = 150, 100
SPIN_BUTTON_X = (WIDTH // 2) - BUTTON_WIDTH * 2 - 20
AUTO_SPIN_BUTTON_X = (WIDTH // 2) - BUTTON_WIDTH - 10
RESET_BUTTON_X = (WIDTH // 2) + 10
SETTINGS_BUTTON_X = (WIDTH // 2) + BUTTON_WIDTH + 20
BUTTON_Y = HEIGHT - BUTTON_HEIGHT - 50

# Table properties
TABLE_X = 40
TABLE_Y = CENTER[1] + RADIUS + 50
CELL_WIDTH = 100
CELL_HEIGHT = 40
TABLE_COLS = 10
TABLE_ROWS = 5

# Settings button properties
SETTINGS_BUTTON_SIZE = 60
SETTINGS_SPACING = 100

# Default settings
default_settings = {
    "sections": 37,
    "max_speed": 20,
    "min_spins": 5,
    "max_spins": 10,
    "deceleration": 0.1,
    "darkness": 1,
    "auto_spin": 0
}

# Current settings
current_settings = default_settings.copy()

# Generate pastel rainbow colors with darkness
def generate_pastel_rainbow_colors(num_sections, darkness):
    base_colors = [tuple(int(255 * c) for c in colorsys.hsv_to_rgb(i / num_sections, 0.4, 0.9))
                   for i in range(num_sections)]
    darken_factor = 0.9 - (darkness - 1) * 0.1
    return [tuple(int(c * darken_factor) for c in color) for color in base_colors]

# Initialize number colors
def initialize_number_colors(sections, darkness):
    global number_colors
    colors = generate_pastel_rainbow_colors(sections, darkness)
    number_colors.clear()
    for i, num in enumerate(range(1, sections + 1)):
        number_colors[num] = colors[i % len(colors)]

# Function to draw the wheel
def draw_wheel(angle, numbers):
    screen.fill(BLACK)
    sections = len(numbers)
    if sections == 0:
        return
    angle_per_section = 360 / sections
    colors = generate_pastel_rainbow_colors(sections, darkness)
    num_points = max(10, int(360 / sections / 2))
    for i, num in enumerate(numbers):
        start_angle = math.radians(angle + i * angle_per_section)
        end_angle = math.radians(angle + (i + 1) * angle_per_section)
        points = [CENTER]
        for j in range(num_points + 1):
            theta = start_angle + (end_angle - start_angle) * j / num_points
            x = CENTER[0] + RADIUS * math.cos(theta)
            y = CENTER[1] - RADIUS * math.sin(theta)
            points.append((x, y))
        pygame.draw.polygon(screen, colors[i], points)
        pygame.draw.polygon(screen, DARK_BROWN, points, 2)
        num_angle = angle + (i + 0.5) * angle_per_section
        num_x = CENTER[0] + (RADIUS - 30) * math.cos(math.radians(num_angle))
        num_y = CENTER[1] - (RADIUS - 30) * math.sin(math.radians(num_angle))
        text = font.render(str(num), True, BLACK)
        rotation_angle = num_angle - 90
        rotated_text = pygame.transform.rotate(text, rotation_angle)
        text_rect = rotated_text.get_rect(center=(num_x, num_y))
        screen.blit(rotated_text, text_rect)

# Draw the pointer
def draw_pointer():
    base_width = 60
    height = 60
    half_base = base_width / 2
    tip_y = CENTER[1] + RADIUS - 15
    tip_x = CENTER[0]
    base_y = tip_y + height
    base_left_x = CENTER[0] - half_base
    base_right_x = CENTER[0] + half_base
    red_height = height / 5
    red_base_y = tip_y + red_height
    red_left_x = tip_x - (half_base * red_height / height)
    red_right_x = tip_x + (half_base * red_height / height)
    black_points = [(base_left_x, base_y), (base_right_x, base_y), (red_right_x, red_base_y), (red_left_x, red_base_y)]
    pygame.draw.polygon(screen, BLACK, black_points)
    red_points = [(red_left_x, red_base_y), (red_right_x, red_base_y), (tip_x, tip_y)]
    pygame.draw.polygon(screen, RED, red_points)
    return (tip_x, tip_y)

# Draw gradient button
def draw_gradient_button(x, y, text, hovered, width=BUTTON_WIDTH, height=BUTTON_HEIGHT):
    surface = pygame.Surface((width, height))
    top_color = BUTTON_HOVER_TOP if hovered else BUTTON_TOP
    bottom_color = BUTTON_HOVER_BOTTOM if hovered else BUTTON_BOTTOM
    for dy in range(height):
        alpha = dy / (height - 1)
        color = tuple(int(top_color[i] * (1 - alpha) + bottom_color[i] * alpha) for i in range(3))
        pygame.draw.line(surface, color, (0, dy), (width, dy))
    screen.blit(surface, (x, y))
    text_surface = font.render(text, True, BLACK)
    text_rect = text_surface.get_rect(center=(x + width // 2, y + height // 2))
    screen.blit(text_surface, text_rect)

# Draw the winners table
def draw_winners():
    if winners:
        for row in range(TABLE_ROWS):
            for col in range(TABLE_COLS):
                pygame.draw.rect(screen, DARK_BROWN, 
                               (TABLE_X + col * CELL_WIDTH, TABLE_Y + row * CELL_HEIGHT, 
                                CELL_WIDTH, CELL_HEIGHT), 1)
        for i, num in enumerate(winners):
            row = i // TABLE_COLS
            col = i % TABLE_COLS
            if row < TABLE_ROWS:
                text = winner_font.render(str(num), True, number_colors[num])
                text_rect = text.get_rect(center=(TABLE_X + col * CELL_WIDTH + CELL_WIDTH // 2,
                                                TABLE_Y + row * CELL_HEIGHT + CELL_HEIGHT // 2))
                screen.blit(text, text_rect)

# Calculate section from tip coordinates
def get_winning_section(tip_x, tip_y, angle, numbers):
    sections = len(numbers)
    if sections == 0:
        return None
    angle_per_section = 360 / sections
    dx = tip_x - CENTER[0]
    dy = CENTER[1] - tip_y
    tip_angle = math.degrees(math.atan2(dy, dx)) % 360
    final_angle = (angle % 360)
    if final_angle < 0:
        final_angle += 360
    relative_angle = (tip_angle - final_angle) % 360
    section_idx = int(relative_angle // angle_per_section) % sections
    return numbers[section_idx]

# Draw settings screen
def draw_settings_screen(settings):
    screen.fill(BLACK)
    settings_y_start = HEIGHT // 2 - (7 * SETTINGS_SPACING) // 2
    labels = [
        ("Sections:", str(settings["sections"]), settings_y_start),
        ("Max Speed:", str(settings["max_speed"]), settings_y_start + SETTINGS_SPACING),
        ("Min Spins:", str(settings["min_spins"]), settings_y_start + 2 * SETTINGS_SPACING),
        ("Max Spins:", str(settings["max_spins"]), settings_y_start + 3 * SETTINGS_SPACING),
        ("Deceleration:", f"{settings['deceleration']:.2f}", settings_y_start + 4 * SETTINGS_SPACING),
        ("Darkness (1-10):", str(settings["darkness"]), settings_y_start + 5 * SETTINGS_SPACING),
        ("Auto Spin Count:", str(settings["auto_spin"]), settings_y_start + 6 * SETTINGS_SPACING)
    ]
    for label, value, y in labels:
        label_text = settings_font.render(label, True, WHITE)
        value_text = settings_font.render(value, True, WHITE)
        label_x = WIDTH // 2 - 200
        value_x = WIDTH // 2 + 50
        screen.blit(label_text, (label_x - label_text.get_width() // 2, y))
        screen.blit(value_text, (value_x - value_text.get_width() // 2, y))
        draw_gradient_button(value_x + 100, y - 10, "+", 
                            pygame.Rect(value_x + 100, y - 10, SETTINGS_BUTTON_SIZE, SETTINGS_BUTTON_SIZE).collidepoint(pygame.mouse.get_pos()), 
                            SETTINGS_BUTTON_SIZE, SETTINGS_BUTTON_SIZE)
        draw_gradient_button(value_x + 180, y - 10, "−", 
                            pygame.Rect(value_x + 180, y - 10, SETTINGS_BUTTON_SIZE, SETTINGS_BUTTON_SIZE).collidepoint(pygame.mouse.get_pos()), 
                            SETTINGS_BUTTON_SIZE, SETTINGS_BUTTON_SIZE)
    
    reset_y = settings_y_start + 7 * SETTINGS_SPACING + 20
    draw_gradient_button(WIDTH // 2 - BUTTON_WIDTH - 10, reset_y, "Reset to Default", 
                        pygame.Rect(WIDTH // 2 - BUTTON_WIDTH - 10, reset_y, BUTTON_WIDTH, BUTTON_HEIGHT).collidepoint(pygame.mouse.get_pos()))
    draw_gradient_button(WIDTH // 2 + 10, reset_y, "Save", 
                        pygame.Rect(WIDTH // 2 + 10, reset_y, BUTTON_WIDTH, BUTTON_HEIGHT).collidepoint(pygame.mouse.get_pos()))

# Handle settings input
def handle_settings_input(event, settings):
    if event.type == pygame.MOUSEBUTTONDOWN:
        pos = pygame.mouse.get_pos()
        settings_y_start = HEIGHT // 2 - (7 * SETTINGS_SPACING) // 2
        value_x = WIDTH // 2 + 50
        for i, key in enumerate(["sections", "max_speed", "min_spins", "max_spins", "deceleration", "darkness", "auto_spin"]):
            y = settings_y_start + i * SETTINGS_SPACING - 10
            plus_rect = pygame.Rect(value_x + 100, y, SETTINGS_BUTTON_SIZE, SETTINGS_BUTTON_SIZE)
            minus_rect = pygame.Rect(value_x + 180, y, SETTINGS_BUTTON_SIZE, SETTINGS_BUTTON_SIZE)
            if plus_rect.collidepoint(pos):
                if key == "deceleration":
                    settings[key] = min(1.0, settings[key] + 0.01)
                else:
                    settings[key] += 1
            elif minus_rect.collidepoint(pos):
                if key == "deceleration":
                    settings[key] = max(0.01, settings[key] - 0.01)
                else:
                    settings[key] -= 1
            if key == "sections":
                settings[key] = min(max(1, settings[key]), 100)
            elif key == "max_speed":
                settings[key] = min(max(1, settings[key]), 50)
            elif key == "min_spins":
                settings[key] = min(max(1, settings[key]), 20)
            elif key == "max_spins":
                settings[key] = min(max(settings["min_spins"], settings[key]), 30)
            elif key == "darkness":
                settings[key] = min(max(1, settings[key]), 10)
            elif key == "auto_spin":
                settings[key] = min(max(0, settings[key]), 50)
        
        reset_y = settings_y_start + 7 * SETTINGS_SPACING + 20
        if WIDTH // 2 - BUTTON_WIDTH - 10 <= pos[0] <= WIDTH // 2 - 10 and reset_y <= pos[1] <= reset_y + BUTTON_HEIGHT:
            return "reset"
        elif WIDTH // 2 + 10 <= pos[0] <= WIDTH // 2 + BUTTON_WIDTH + 10 and reset_y <= pos[1] <= reset_y + BUTTON_HEIGHT:
            return "save"
    return None

# Apply settings
def apply_settings(settings):
    global initial_sections, max_speed, min_spins, max_spins, deceleration, darkness
    initial_sections = settings["sections"]
    max_speed = settings["max_speed"]
    min_spins = settings["min_spins"]
    max_spins = settings["max_spins"]
    deceleration = settings["deceleration"]
    darkness = settings["darkness"]
    return list(range(1, initial_sections + 1))

# Initialize colors
initialize_number_colors(initial_sections, darkness)

# Main loop
running = True
clock = pygame.time.Clock()

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif settings_active:
            action = handle_settings_input(event, current_settings)
            if action == "reset":
                current_settings = default_settings.copy()
            elif action == "save":
                remaining_numbers = apply_settings(current_settings)
                winners.clear()
                initialize_number_colors(initial_sections, darkness)
                settings_active = False
        elif event.type == pygame.MOUSEBUTTONDOWN and not spinning:
            pos = pygame.mouse.get_pos()
            print(f"Touch/Click at: {pos}")
            dx = pos[0] - CENTER[0]
            dy = pos[1] - CENTER[1]
            distance = math.sqrt(dx * dx + dy * dy)
            if distance <= RADIUS:  # Touch on wheel
                dragging = True
                last_pos = pos
                last_time = time.time()
                drag_velocity = 0
            elif SPIN_BUTTON_X <= pos[0] <= SPIN_BUTTON_X + BUTTON_WIDTH and BUTTON_Y <= pos[1] <= BUTTON_Y + BUTTON_HEIGHT:
                if remaining_numbers:
                    print("Spin clicked!")
                    if winners:
                        last_winner = winners[-1]
                        if last_winner in remaining_numbers:
                            remaining_numbers.remove(last_winner)
                    if remaining_numbers:
                        spinning = True
                        spin_speed = max_speed
                        extra_spins = random.randint(min_spins, max_spins) * 360
                        spin_distance_remaining = extra_spins
            elif AUTO_SPIN_BUTTON_X <= pos[0] <= AUTO_SPIN_BUTTON_X + BUTTON_WIDTH and BUTTON_Y <= pos[1] <= BUTTON_Y + BUTTON_HEIGHT:
                if remaining_numbers:
                    print("Auto Spin clicked!")
                    auto_spinning = True
                    auto_spin_count = current_settings["auto_spin"]
            elif RESET_BUTTON_X <= pos[0] <= RESET_BUTTON_X + BUTTON_WIDTH and BUTTON_Y <= pos[1] <= BUTTON_Y + BUTTON_HEIGHT:
                print("Reset clicked!")
                angle = 90
                winners.clear()
                remaining_numbers = list(range(1, initial_sections + 1))
                initialize_number_colors(initial_sections, darkness)
            elif SETTINGS_BUTTON_X <= pos[0] <= SETTINGS_BUTTON_X + BUTTON_WIDTH and BUTTON_Y <= pos[1] <= BUTTON_Y + BUTTON_HEIGHT:
                print("Settings clicked!")
                settings_active = True
        elif event.type == pygame.MOUSEMOTION and dragging:
            pos = pygame.mouse.get_pos()
            current_time = time.time()
            dx = pos[0] - CENTER[0]
            dy = pos[1] - CENTER[1]
            distance = math.sqrt(dx * dx + dy * dy)
            if distance <= RADIUS and last_pos:
                last_dx = last_pos[0] - CENTER[0]
                last_dy = last_pos[1] - CENTER[1]
                last_angle = math.atan2(last_dy, last_dx)
                current_angle = math.atan2(dy, dx)
                angle_diff = math.degrees(current_angle - last_angle)
                if angle_diff > 180:
                    angle_diff -= 360
                elif angle_diff < -180:
                    angle_diff += 360
                time_diff = current_time - last_time
                if time_diff > 0:
                    angular_velocity = angle_diff / time_diff
                    angle -= angular_velocity * 0.016  # Real-time update at ~60 FPS
                    drag_velocity = angular_velocity  # Store latest velocity
            last_pos = pos
            last_time = current_time
        elif event.type == pygame.MOUSEBUTTONUP and dragging:
            dragging = False
            if last_pos and remaining_numbers:
                pos = pygame.mouse.get_pos()
                dx = pos[0] - CENTER[0]
                dy = pos[1] - CENTER[1]
                distance = math.sqrt(dx * dx + dy * dy)
                if distance <= RADIUS:
                    # Use the last calculated drag velocity
                    spin_speed = min(max_speed, abs(drag_velocity) * 0.1) * (-1 if drag_velocity < 0 else 1)
                    if abs(spin_speed) > 0.5:  # Minimum threshold to spin
                        spinning = True
                        # Spin distance proportional to speed
                        spin_distance_remaining = abs(drag_velocity) * 10 + random.randint(min_spins, max_spins) * 360
                        if winners and remaining_numbers:
                            last_winner = winners[-1]
                            if last_winner in remaining_numbers:
                                remaining_numbers.remove(last_winner)
            last_pos = None
            last_time = None
            drag_velocity = 0

    # Check hover
    mouse_pos = pygame.mouse.get_pos()
    spin_hovered = (SPIN_BUTTON_X <= mouse_pos[0] <= SPIN_BUTTON_X + BUTTON_WIDTH and BUTTON_Y <= mouse_pos[1] <= BUTTON_Y + BUTTON_HEIGHT)
    auto_spin_hovered = (AUTO_SPIN_BUTTON_X <= mouse_pos[0] <= AUTO_SPIN_BUTTON_X + BUTTON_WIDTH and BUTTON_Y <= mouse_pos[1] <= BUTTON_Y + BUTTON_HEIGHT)
    reset_hovered = (RESET_BUTTON_X <= mouse_pos[0] <= RESET_BUTTON_X + BUTTON_WIDTH and BUTTON_Y <= mouse_pos[1] <= BUTTON_Y + BUTTON_HEIGHT)
    settings_hovered = (SETTINGS_BUTTON_X <= mouse_pos[0] <= SETTINGS_BUTTON_X + BUTTON_WIDTH and BUTTON_Y <= mouse_pos[1] <= BUTTON_Y + BUTTON_HEIGHT)

    # Update spin
    if spinning or auto_spinning:
        if not spinning and auto_spinning and auto_spin_count > 0 and remaining_numbers:
            spinning = True
            spin_speed = max_speed
            extra_spins = random.randint(min_spins, max_spins) * 360
            spin_distance_remaining = extra_spins
            auto_spin_count -= 1
            if winners:
                last_winner = winners[-1]
                if last_winner in remaining_numbers:
                    remaining_numbers.remove(last_winner)
        
        if spinning:
            angle -= spin_speed
            spin_distance_remaining -= abs(spin_speed)
            if spin_distance_remaining <= 0:
                spin_speed -= deceleration * (1 if spin_speed > 0 else -1)
                if abs(spin_speed) <= deceleration:
                    spinning = False
                    tip_x, tip_y = draw_pointer()
                    winning_number = get_winning_section(tip_x, tip_y, angle, remaining_numbers)
                    if winning_number is not None:
                        winners.append(winning_number)
                        print(f"Tip at ({tip_x}, {tip_y}), Angle: {angle % 360}, Winner: {winning_number}")
                    if auto_spinning and auto_spin_count == 0:
                        auto_spinning = False

    # Draw everything
    if settings_active:
        draw_settings_screen(current_settings)
    else:
        draw_wheel(angle, remaining_numbers)
        tip_x, tip_y = draw_pointer()
        draw_winners()
        draw_gradient_button(SPIN_BUTTON_X, BUTTON_Y, "Spin", spin_hovered)
        draw_gradient_button(AUTO_SPIN_BUTTON_X, BUTTON_Y, "Auto Spin", auto_spin_hovered)
        draw_gradient_button(RESET_BUTTON_X, BUTTON_Y, "Reset", reset_hovered)
        draw_gradient_button(SETTINGS_BUTTON_X, BUTTON_Y, "Settings", settings_hovered)
    pygame.display.flip()
    clock.tick(60)

pygame.quit()