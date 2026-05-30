from mcp.server.fastmcp import FastMCP
import urllib.parse

mcp = FastMCP("Calendar and Travel Server")

# Resource: calendar://events/{year}
@mcp.resource("calendar://events/{year}")
def get_calendar_events(year: str) -> str:
    """Retrieve calendar events for a specific year."""
    if year == "2025":
        return """# Calendar Events - 2025
- 2025-06-10: Commute Block / Travel to Airport (Madrid flight)
- 2025-06-11: Fly from Boston to Madrid (Tentative, Flight IB-102)
- 2025-06-12: Vacation in Spain (Madrid and Barcelona)
- 2025-06-20: Design Review Meeting (Remote, Zoom, 3:00 PM CET)
- 2025-06-25: Fly back to Boston
"""
    return f"# Calendar Events - {year}\nNo events scheduled for this year."

# Resource: calendar://my-calendar/{month_year}
@mcp.resource("calendar://my-calendar/{month_year}")
def get_monthly_calendar(month_year: str) -> str:
    """Retrieve calendar events for a specific month/year."""
    if month_year.lower() == "june-2025":
        return """# Monthly Calendar hold: June 2025
- June 10, 2025: COMMUTE - Personal commute block for packing & airport shuttle
- June 11 - June 25, 2025: TRAVEL - Trip to Spain (Madrid, Barcelona, Seville)
- June 20, 2025 15:00 - 16:30: MEETING - Q2 Architecture Alignment (Organizer: Alex, Status: Tentative)
"""
    return f"# Calendar for {month_year}\nNo events."

# Resource: travel://preferences/{destination}
@mcp.resource("travel://preferences/{destination}")
def get_travel_preferences(destination: str) -> str:
    """Retrieve travel preferences for a specific region/destination."""
    if destination.lower() == "europe":
        return """# European Travel Preferences
- Hotel Class: 4-star boutique hotels preferred
- Flight Class: Business or Premium Economy
- Preferred Airlines: British Airways, Lufthansa, Iberia
- Train Class: First class for high-speed rail (AVE, TGV)
- Privacy: Always book flights as private blocks on the calendar
"""
    return f"# Travel Preferences for {destination}\nDefault preferences: Economy class, standard hotels."

# Resource: travel://past-trips/{trip_name}
@mcp.resource("travel://past-trips/{trip_name}")
def get_past_trips(trip_name: str) -> str:
    """Retrieve details for past trips."""
    if trip_name.lower() == "spain-2025":
        return """# Past Trip - Spain 2025
- Duration: June 11 - June 25, 2025
- Cities Visited: Madrid, Barcelona, Seville
- Flight Path: BOS -> MAD -> BCN -> SVQ -> MAD -> BOS
- Notable Events: Visit to Sagrada Familia, Prado Museum Tour
- Lodging: Only Central Hotels with quiet workspaces
"""
    return f"# Past Trip - {trip_name}\nNo record of this trip."

# Tool: read_resource
@mcp.tool()
def read_resource(uri: str) -> str:
    """Read contents of a resource by its URI.
    Supported resources:
    - calendar://events/{year} (e.g. calendar://events/2025)
    - calendar://my-calendar/{month_year} (e.g. calendar://my-calendar/June-2025)
    - travel://preferences/{destination} (e.g. travel://preferences/europe)
    - travel://past-trips/{trip_name} (e.g. travel://past-trips/Spain-2025)
    """
    parsed = urllib.parse.urlparse(uri)
    scheme = parsed.scheme
    netloc = parsed.netloc
    path = parsed.path.strip("/")
    
    if scheme == "calendar":
        if netloc == "events":
            return get_calendar_events(path)
        elif netloc == "my-calendar":
            return get_monthly_calendar(path)
    elif scheme == "travel":
        if netloc == "preferences":
            return get_travel_preferences(path)
        elif netloc == "past-trips":
            return get_past_trips(path)
            
    return f"Error: Unsupported resource URI '{uri}'"

if __name__ == "__main__":
    mcp.run()
